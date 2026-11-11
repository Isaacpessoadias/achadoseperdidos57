const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { logger } = require('firebase-functions');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');

initializeApp();

const db = getFirestore();
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const PUSH_BATCH_SIZE = 100;

async function sendPushToDevices(deviceSnapshots, notification, data) {
  const destinations = deviceSnapshots.docs
    .map((deviceSnapshot) => ({
      reference: deviceSnapshot.ref,
      token: deviceSnapshot.get('expoPushToken') || deviceSnapshot.id,
    }))
    .filter(({ token }) => typeof token === 'string' && token.length > 0);

  for (let offset = 0; offset < destinations.length; offset += PUSH_BATCH_SIZE) {
    const batch = destinations.slice(offset, offset + PUSH_BATCH_SIZE);
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch.map(({ token }) => ({
        to: token,
        title: notification.title || 'Nova notificação',
        body: notification.body || '',
        sound: 'default',
        channelId: 'default',
        data,
      }))),
    });

    if (!response.ok) {
      throw new Error(`Expo Push Service retornou HTTP ${response.status}.`);
    }

    const result = await response.json();
    if (!Array.isArray(result.data) || result.data.length !== batch.length) {
      throw new Error('Resposta inválida do Expo Push Service.');
    }

    const invalidDeviceReferences = [];
    const receiptBatch = db.batch();
    result.data.forEach((ticket, index) => {
      if (ticket.status === 'ok' && ticket.id) {
        receiptBatch.set(db.collection('expoPushReceipts').doc(ticket.id), {
          devicePath: batch[index].reference.path,
          createdAt: new Date(),
        });
        return;
      }

      logger.warn('Falha ao enviar push do Expo.', {
        message: ticket.message,
        error: ticket.details?.error,
      });
      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
        invalidDeviceReferences.push(batch[index].reference);
      }
    });

    await receiptBatch.commit();
    await Promise.all(invalidDeviceReferences.map((reference) => reference.delete()));
  }
}

exports.sendUserNotificationPush = onDocumentCreated({
  document: 'profiles/{userId}/notifications/{notificationId}',
  retry: true,
}, async (event) => {
  const notification = event.data?.data();
  if (!notification) {
    return;
  }

  const deviceSnapshots = await db.collection('profiles')
    .doc(event.params.userId)
    .collection('devices')
    .get();

  await sendPushToDevices(deviceSnapshots, notification, {
    type: notification.type || 'notification',
    notificationId: event.params.notificationId,
    itemId: notification.itemId || '',
  });
});

exports.sendFoundRequestPush = onDocumentCreated({
  document: 'notificationRequests/{requestId}',
  retry: true,
}, async (event) => {
  const request = event.data?.data();
  if (!request || request.status !== 'pending') {
    return;
  }

  const serverDevices = await db.collectionGroup('devices')
    .where('accountType', '==', 'server')
    .get();
  const verifiedServerDevices = await Promise.all(serverDevices.docs.map(async (deviceSnapshot) => {
    const profileReference = deviceSnapshot.ref.parent.parent;
    if (!profileReference) {
      return null;
    }

    try {
      const account = await getAuth().getUser(profileReference.id);
      const email = (account.email || '').trim().toLowerCase();
      const isServerEmail = /^[^@\s]+@(?:[a-z0-9-]+\.)?ifpe\.edu\.br$/.test(email)
        && !email.endsWith('@discente.ifpe.edu.br');
      return isServerEmail ? deviceSnapshot : null;
    } catch (error) {
      logger.warn('Não foi possível validar a conta para o push de servidor.', {
        userId: profileReference.id,
        message: error.message,
      });
      return null;
    }
  }));

  await sendPushToDevices({ docs: verifiedServerDevices.filter(Boolean) }, request, {
    type: 'item_found_request',
    requestId: event.params.requestId,
    itemId: request.itemId || event.params.requestId,
  });
});

exports.checkExpoPushReceipts = onSchedule('every 15 minutes', async () => {
  const pendingReceipts = await db.collection('expoPushReceipts')
    .limit(1000)
    .get();
  if (pendingReceipts.empty) {
    return;
  }

  const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: pendingReceipts.docs.map((receipt) => receipt.id) }),
  });
  if (!response.ok) {
    throw new Error(`Expo Push Service retornou HTTP ${response.status} ao consultar recibos.`);
  }

  const result = await response.json();
  for (let offset = 0; offset < pendingReceipts.docs.length; offset += 500) {
    const batch = db.batch();
    pendingReceipts.docs.slice(offset, offset + 500).forEach((receiptSnapshot) => {
      const receipt = result.data?.[receiptSnapshot.id];
      if (!receipt) {
        const createdAt = receiptSnapshot.get('createdAt')?.toDate?.();
        if (createdAt && Date.now() - createdAt.getTime() >= 24 * 60 * 60 * 1000) {
          batch.delete(receiptSnapshot.ref);
        }
        return;
      }

      if (receipt.status === 'error') {
        logger.warn('Falha na entrega do push do Expo.', {
          message: receipt.message,
          error: receipt.details?.error,
        });
        if (receipt.details?.error === 'DeviceNotRegistered') {
          const devicePath = receiptSnapshot.get('devicePath');
          if (typeof devicePath === 'string') {
            batch.delete(db.doc(devicePath));
          }
        }
      }
      batch.delete(receiptSnapshot.ref);
    });
    await batch.commit();
  }
});
