import * as FileSystem from 'expo-file-system/legacy';
import ButtonPrimary from './src/components/ButtonPrimary';
import TextField from './src/components/TextField';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@expo/ui/community/datetime-picker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { theme } from './src/theme';
import { getApps, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  initializeAuth,
  inMemoryPersistence,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  arrayUnion,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const firebaseConfig = {
  apiKey: 'AIzaSyCUdPfqfF9NLLr4zI4TTtG54DJUh7Rio3c',
  authDomain: 'achaai-a08e1.firebaseapp.com',
  projectId: 'achaai-a08e1',
  storageBucket: 'achaai-a08e1.firebasestorage.app',
  messagingSenderId: '873681609063',
  appId: '1:873681609063:web:0482b0cdc1c2fa6534cfc2',
  measurementId: 'G-8DR7XC82BD',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = initializeAuth(app, { persistence: inMemoryPersistence });
const db = getFirestore(app);

const DEFAULT_PROFILE_IMAGE = require('./f111634416.jpg');
const CLOUD_NAME = 'wljwnlav';
const UPLOAD_PRESET = 'Fotos Itens';
const ITEM_CATEGORIES = [
  { label: 'Documento', symbol: '📄' },
  { label: 'Eletrônicos (celular, notebook etc)', symbol: '📱' },
  { label: 'Garrafa', symbol: '🧴' },
  { label: 'Material Escolar', symbol: '✏️' },
  { label: 'Óculos', symbol: '👓' },
  { label: 'Guarda Chuva', symbol: '☂️' },
  { label: 'Bolsa', symbol: '👜' },
  { label: 'Roupas', symbol: '👕' },
  { label: 'Calçados', symbol: '👟' },
  { label: 'Outros', symbol: '📦' },
];
const ACCOUNT_DOMAIN_HINT = 'Servidor: nome@jaboatao.ifpe.edu.br | Aluno: nome@discente.ifpe.edu.br';

const normalizeItemCategory = (category) => {
  const normalizedCategory = (category || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();

  if (normalizedCategory.includes('documento')) {
    return 'Documento';
  }

  if (normalizedCategory.includes('eletron')) {
    return 'Eletrônicos (celular, notebook etc)';
  }

  if (normalizedCategory.includes('garrafa')) {
    return 'Garrafa';
  }

  if (normalizedCategory.includes('material escolar')) {
    return 'Material Escolar';
  }

  if (normalizedCategory.includes('ocul')) {
    return 'Óculos';
  }

  if (normalizedCategory.includes('guarda chuva') || normalizedCategory.includes('guardachuva')) {
    return 'Guarda Chuva';
  }

  if (normalizedCategory.includes('bolsa')) {
    return 'Bolsa';
  }

  if (normalizedCategory.includes('roup') || normalizedCategory.includes('vestu')) {
    return 'Roupas';
  }

  if (normalizedCategory.includes('calcad')) {
    return 'Calçados';
  }

  return 'Outros';
};

const getCategoryOption = (category) => (
  ITEM_CATEGORIES.find((option) => option.label === normalizeItemCategory(category))
  || ITEM_CATEGORIES.find((option) => option.label === 'Outros')
);

const parseDateInput = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (date.getFullYear() !== Number(year)
    || date.getMonth() !== Number(month) - 1
    || date.getDate() !== Number(day)) {
    return null;
  }

  return value;
};

const formatStoredDate = (value) => (value ? value.split('-').reverse().join('/') : 'Não informada');
const formatItemTimestamp = (value) => {
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? 'Não informada' : date.toLocaleString('pt-BR');
};

const getTimestampMillis = (value) => {
  if (typeof value?.toMillis === 'function') {
    return value.toMillis();
  }
  const date = typeof value?.toDate === 'function'
    ? value.toDate()
    : value instanceof Date || typeof value === 'string'
      ? new Date(value)
      : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : null;
};

const getOldItemLabel = (item, now = Date.now()) => {
  if (item.status === 'recovered' || item.type === 'recovered') {
    return null;
  }

  const type = item.type || 'found';
  const timestamp = getTimestampMillis(
    type === 'lost' ? item.createdAt : item.foundAtDaeeAt || item.createdAt,
  );
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  if (timestamp === null || now - timestamp < ONE_WEEK_MS) {
    return null;
  }

  return type === 'lost' ? 'Perdido há muito tempo' : 'Achado há muito tempo';
};
const toStoredDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const fromStoredDate = (value) => {
  if (!value) {
    return new Date();
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getAccountType = (emailAddress) => {
  const normalizedEmail = (emailAddress || '').trim().toLowerCase();

  if (/^[^@\s]+@discente\.ifpe\.edu\.br$/.test(normalizedEmail)) {
    return 'student';
  }

  if (/^[^@\s]+@(?:[a-z0-9-]+\.)?ifpe\.edu\.br$/.test(normalizedEmail)) {
    return 'server';
  }

  return null;
};

const formatDateTime = (value) => {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString('pt-BR') : 'Horário indisponível';
};

const formatDisplayEmail = (emailAddress) => (emailAddress || '').replace(
  /@xn--jaboato-2wa\.ifpe\.edu\.br$/i,
  '@jaboatão.ifpe.edu.br',
);

const getFriendlyAuthError = (error, action) => {
  const code = error?.code || '';
  const messages = {
    'auth/invalid-email': 'O e-mail informado está inválido. Verifique e tente novamente.',
    'auth/user-disabled': 'Essa conta foi desativada. Entre em contato com o suporte.',
    'auth/user-not-found': 'Nenhuma conta foi encontrada com esse e-mail.',
    'auth/wrong-password': 'Senha incorreta. Tente novamente.',
    'auth/invalid-credential': 'Senha atual incorreta. Confira e tente novamente.',
    'auth/email-already-in-use': 'Esse e-mail já está cadastrado. Faça login ou use outro e-mail.',
    'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
    'auth/network-request-failed': 'Não foi possível conectar ao servidor. Verifique sua internet.',
    'auth/configuration-not-found': 'A configuração do Firebase não foi encontrada. Verifique o projeto no console.',
    'auth/operation-not-allowed': 'Esse tipo de login está desativado no Firebase.',
    'auth/requires-recent-login': 'Faça login novamente para concluir esta ação.',
  };

  return messages[code] || `Não foi possível ${action}. Tente novamente.`;
};

const getFirestoreError = (error, action) => {
  if (error?.code === 'permission-denied') {
    return `Permissão negada ao ${action}. Publique as regras do Firestore para profiles, items e comments.`;
  }

  if (error?.code === 'unavailable' || error?.code === 'failed-precondition') {
    return `Não foi possível ${action} agora. Verifique a conexão e o Firestore.`;
  }

  return `Falha ao ${action}. Tente novamente.`;
};

const uploadImage = async (uri, fileName, webFile) => {
  if (!uri) {
    throw new Error('URI inválida para upload.');
  }

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  let responseStatus;
  let result;

  if (Platform.OS === 'web') {
    const formData = new FormData();
    const file = webFile || await (await fetch(uri)).blob();
    formData.append('file', file, fileName || 'upload.jpg');
    formData.append('upload_preset', UPLOAD_PRESET);

    const response = await fetch(uploadUrl, { method: 'POST', body: formData });
    responseStatus = response.status;
    result = await response.json();
  } else {
    const response = await FileSystem.uploadAsync(uploadUrl, uri, {
      fieldName: 'file',
      httpMethod: 'POST',
      mimeType: 'image/jpeg',
      parameters: { upload_preset: UPLOAD_PRESET },
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    });
    responseStatus = response.status;
    result = JSON.parse(response.body);
  }

  if (responseStatus >= 200 && responseStatus < 300
    && typeof result?.secure_url === 'string' && result.secure_url) {
    return result.secure_url;
  }

  const errorMessage = result?.error?.message || `Cloudinary rejeitou o upload (${responseStatus}).`;
  throw new Error(errorMessage);
};

const CommentItem = React.memo(function CommentItem({ comment, itemId, user, profileName, profileImage }) {
  const [isReplying, setIsReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyError, setReplyError] = useState('');
  const replies = Array.isArray(comment.replies) ? comment.replies : [];

  const handleReply = async () => {
    const text = replyText.trim();
    if (!text || !user?.uid || isSendingReply) {
      return;
    }

    setIsSendingReply(true);
    setReplyError('');
    try {
      await updateDoc(doc(db, 'items', itemId, 'comments', comment.id), {
        replies: arrayUnion({
          userId: user.uid,
          authorName: profileName || user.displayName || user.email || 'Usuário',
          authorPhotoUrl: profileImage || '',
          text,
          createdAt: new Date().toISOString(),
        }),
      });
      setReplyText('');
      setIsReplying(false);
      setShowReplies(true);
    } catch (error) {
      // Show raw error for debugging
      const detailed = typeof error?.message === 'string' ? error.message : JSON.stringify(error);
      setReplyError(detailed);
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <View style={styles.commentThread}>
      <View style={styles.commentRow}>
        <Image
          source={comment.authorPhotoUrl ? { uri: comment.authorPhotoUrl } : DEFAULT_PROFILE_IMAGE}
          style={styles.commentAvatar}
          resizeMode="cover"
        />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>{comment.authorName || 'Usuário'}</Text>
            <TouchableOpacity
              style={styles.replyButton}
              onPress={() => setIsReplying((replying) => !replying)}
              accessibilityRole="button"
              accessibilityLabel={`Responder ao comentário de ${comment.authorName || 'usuário'}`}
            >
              <Text style={styles.replyButtonText}>Responder</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.commentText}>{comment.text}</Text>
          {replies.length > 0 && (
            <TouchableOpacity
              style={styles.showRepliesButton}
              onPress={() => setShowReplies((showing) => !showing)}
              accessibilityRole="button"
            >
              <Text style={styles.showRepliesText}>
                {showReplies ? 'Ocultar respostas' : 'Clique para mostrar as respostas'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {isReplying && (
        <View style={styles.replyComposer}>
          <TextInput
            style={styles.replyInput}
            placeholder="Escreva uma resposta..."
            value={replyText}
            onChangeText={setReplyText}
            multiline
            maxLength={1000}
            textAlignVertical="top"
          />
          {replyError ? <Text style={styles.errorText}>{replyError}</Text> : null}
          <TouchableOpacity
            style={[styles.replySubmitButton, (!replyText.trim() || isSendingReply) && styles.buttonDisabled]}
            onPress={handleReply}
            disabled={!replyText.trim() || isSendingReply}
            accessibilityRole="button"
          >
            {isSendingReply ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enviar resposta</Text>}
          </TouchableOpacity>
        </View>
      )}
      {showReplies && replies.map((reply, index) => (
        <View style={styles.replyRow} key={`${reply.userId}-${reply.createdAt}-${index}`}>
          <Image
            source={reply.authorPhotoUrl ? { uri: reply.authorPhotoUrl } : DEFAULT_PROFILE_IMAGE}
            style={styles.replyAvatar}
            resizeMode="cover"
          />
          <View style={styles.commentContent}>
            <Text style={styles.commentAuthor}>{reply.authorName || 'Usuário'}</Text>
            <Text style={styles.commentText}>{reply.text}</Text>
          </View>
        </View>
      ))}
    </View>
  );
});

export default function App() {
  const [screen, setScreen] = useState('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ type: '', text: '' });
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('items');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [showCategoryFilters, setShowCategoryFilters] = useState(false);
  const [filterDateMode, setFilterDateMode] = useState('single');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterDatePickerField, setFilterDatePickerField] = useState(null);
  const [filterDateDraft, setFilterDateDraft] = useState(new Date());
  const [myItemFilter, setMyItemFilter] = useState('all');
  const [itemListFilter, setItemListFilter] = useState('lost');
  const [oldItemFilter, setOldItemFilter] = useState('all');
  const [currentTime, setCurrentTime] = useState(0);
  const [profileImage, setProfileImage] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [editingProfileField, setEditingProfileField] = useState('');
  const [profileNameDraft, setProfileNameDraft] = useState('');
  const [profileEmailDraft, setProfileEmailDraft] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [foundItems, setFoundItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemComments, setItemComments] = useState([]);
  const [loadedCommentsForItemId, setLoadedCommentsForItemId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isSendingFoundNotice, setIsSendingFoundNotice] = useState(false);
  const [reportedFoundItemIds, setReportedFoundItemIds] = useState(() => new Set());
  const foundNoticeInFlightRef = useRef(new Set());
  const [isMarkingRecovered, setIsMarkingRecovered] = useState(false);
  const [isRecoveryFormVisible, setIsRecoveryFormVisible] = useState(false);
  const [recoveredPersonName, setRecoveredPersonName] = useState('');
  const [recoveredPersonClass, setRecoveredPersonClass] = useState('');
  const [recoveredPersonEnrollment, setRecoveredPersonEnrollment] = useState('');
  const [recoveryPerson, setRecoveryPerson] = useState(null);
  const [recoveryPersonItemId, setRecoveryPersonItemId] = useState(null);

  const [commentsError, setCommentsError] = useState('');
  const [pickupError, setPickupError] = useState('');
  const [isRegisteringPickup, setIsRegisteringPickup] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemLocation, setItemLocation] = useState('');
  const [itemDateStart, setItemDateStart] = useState('');
  const [itemDateEnd, setItemDateEnd] = useState('');
  const [itemDateMode, setItemDateMode] = useState('single');
  const [datePickerField, setDatePickerField] = useState(null);
  const [itemDateDraft, setItemDateDraft] = useState(new Date());
  const [itemCategory, setItemCategory] = useState('');
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);
  const [itemImage, setItemImage] = useState(null);
  const [itemImageFile, setItemImageFile] = useState(null);
  const [itemType, setItemType] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollViewRef = useRef(null);
  const categoryOptions = useMemo(() => ['Todas', ...ITEM_CATEGORIES.map((option) => option.label)], []);
  const isItemListView = activeView === 'items';
  const hasDateFilter = filterDateMode === 'single'
    ? Boolean(filterDateStart)
    : Boolean(filterDateStart || filterDateEnd);
  const activeNavigationView = ['profile', 'settings', 'myItems'].includes(activeView)
    ? 'profile'
    : 'items';
  const canManageSelectedItem = getAccountType(user?.email) === 'server';
  const canViewRecoveryPerson = getAccountType(user?.email) === 'server'
    || selectedItem?.userId === user?.uid;
  const isLoadingRecoveryPerson = activeView === 'itemDetail'
    && selectedItem?.status === 'recovered'
    && canViewRecoveryPerson
    && recoveryPersonItemId !== selectedItem.id;
  const isLoadingComments = activeView === 'itemDetail'
    && Boolean(selectedItem?.id)
    && loadedCommentsForItemId !== selectedItem.id
    && !commentsError;

  const navigateTo = useCallback((view) => {
    setActiveView(view);
    setShowScrollTop(false);
    setShowCategoryFilters(false);
    setFilterDatePickerField(null);
    if (view === 'itemDetail') {
      setCommentsError('');
    }
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, []);


  useEffect(() => {
    if (activeView !== 'itemDetail' || !selectedItem?.id) {
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'items', selectedItem.id, 'comments'),
      (snapshot) => {
        // Convert each comment document to a plain object and sort newest first.
        const comments = snapshot.docs
          .map((commentSnapshot) => ({ id: commentSnapshot.id, ...commentSnapshot.data() }))
          .sort((a, b) => {
            // Helper to extract a comparable timestamp (ms since epoch).
            const ts = (item) => {
              if (!item?.createdAt) return 0;
              // Firestore Timestamp object
              if (typeof item.createdAt?.toMillis === 'function') {
                return item.createdAt.toMillis();
              }
              // ISO string or other string representation
              if (typeof item.createdAt === 'string') {
                const ms = Date.parse(item.createdAt);
                return Number.isNaN(ms) ? 0 : ms;
              }
              // Date instance
              if (item.createdAt instanceof Date) {
                return item.createdAt.getTime();
              }
              return 0;
            };
            // newest first -> larger timestamp first
            return ts(b) - ts(a);
          });

        setItemComments(comments);
        setLoadedCommentsForItemId(selectedItem.id);
      },
      (error) => {
        setCommentsError(getFirestoreError(error, 'carregar os comentários'));
        setLoadedCommentsForItemId(selectedItem.id);
      },
    );

    return unsubscribe;
  }, [activeView, selectedItem]);

  useEffect(() => {
    if (activeView !== 'itemDetail' || selectedItem?.status !== 'recovered' || !canViewRecoveryPerson) {
      return undefined;
    }

    let isActive = true;
    getDoc(doc(db, 'items', selectedItem.id, 'recoveryDetails', 'claimant'))
      .then((snapshot) => {
        if (isActive) {
          setRecoveryPerson(snapshot.exists() ? snapshot.data() : null);
          setRecoveryPersonItemId(selectedItem.id);
        }
      })
      .catch((error) => {
        if (isActive) {
          setRecoveryPersonItemId(selectedItem.id);
          setStatus({ type: 'error', text: getFirestoreError(error, 'carregar os dados da recuperação') });
        }
      });

    return () => {
      isActive = false;
    };
  }, [activeView, selectedItem?.id, selectedItem?.status, canViewRecoveryPerson]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && !getAccountType(currentUser.email)) {
        await signOut(auth);
        setUser(null);
        setStatus({ type: 'error', text: ACCOUNT_DOMAIN_HINT });
        return;
      }

      setUser(currentUser);
      if (currentUser) {
        navigateTo('items');
      }
    });

    return unsubscribe;
  }, [navigateTo]);

  useEffect(() => {
    const loginSuccessMessage = 'Login realizado com sucesso!';
    if (status.type !== 'success' || status.text !== loginSuccessMessage) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      setStatus((currentStatus) => (
        currentStatus.text === loginSuccessMessage ? { type: '', text: '' } : currentStatus
      ));
    }, 4000);

    return () => clearTimeout(timeout);
  }, [status]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadUserData = async () => {
      let currentProfile = {};
      try {
        const profileSnapshot = await getDoc(doc(db, 'profiles', user.uid));
        const profile = profileSnapshot.exists() ? profileSnapshot.data() : null;
        currentProfile = profile || {};

        if (profile?.photoUrl) {
          setProfileImage(profile.photoUrl);
        } else {
          setProfileImage('');
        }

        setProfileName(profile?.name || user.displayName || '');
      } catch (error) {
        setStatus({ type: 'error', text: getFirestoreError(error, 'carregar o perfil') });
      }

      try {
        const itemsSnapshot = await getDocs(collection(db, 'items'));
        const items = itemsSnapshot.docs
          .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }));
        const creatorIds = [...new Set(items
          .filter((item) => item.userId && (!item.creatorName || !item.creatorEmail || !item.creatorPhotoUrl))
          .map((item) => item.userId))];
        const creatorProfiles = await Promise.all(creatorIds.map(async (creatorId) => {
          try {
            const creatorSnapshot = await getDoc(doc(db, 'profiles', creatorId));
            return [creatorId, creatorSnapshot.exists() ? creatorSnapshot.data() : {}];
          } catch {
            return [creatorId, {}];
          }
        }));
        const creatorProfilesById = new Map(creatorProfiles);
        const itemsWithCreators = items
          .map((item) => {
            const profile = creatorProfilesById.get(item.userId)
              || (item.userId === user.uid ? currentProfile : {});
            return {
              ...item,
              creatorName: item.creatorName || profile.name || '',
              creatorEmail: item.creatorEmail || profile.email || '',
              creatorPhotoUrl: item.creatorPhotoUrl || profile.photoUrl || '',
            };
          })
          .sort((first, second) => {
            const firstDate = new Date(first.createdAt || first.foundAt || 0).getTime();
            const secondDate = new Date(second.createdAt || second.foundAt || 0).getTime();
            return secondDate - firstDate;
          });

        setFoundItems(itemsWithCreators);
      } catch (error) {
        setFoundItems([]);
        setStatus({ type: 'error', text: getFirestoreError(error, 'carregar os itens achados') });
      }
    };

    loadUserData();
  }, [user]);

  useEffect(() => {
    if (currentTime === 0) {
      const timeout = setTimeout(() => setCurrentTime(Date.now()), 0);
      return () => clearTimeout(timeout);
    }

    const nextThreshold = foundItems.reduce((next, item) => {
      if (item.status === 'recovered' || item.type === 'recovered') {
        return next;
      }
      const startTime = getTimestampMillis(
        item.type === 'lost' ? item.createdAt : item.foundAtDaeeAt || item.createdAt,
      );
      const threshold = startTime === null ? null : startTime + 7 * 24 * 60 * 60 * 1000;
      return threshold !== null && threshold > currentTime
        ? Math.min(next, threshold)
        : next;
    }, Number.POSITIVE_INFINITY);

    if (!Number.isFinite(nextThreshold)) {
      return undefined;
    }

    const timeout = setTimeout(() => setCurrentTime(Date.now()), nextThreshold - currentTime);
    return () => clearTimeout(timeout);
  }, [foundItems, currentTime]);

  const clearForm = () => {
    setFullName('');
    setEmail('');
    setPassword('');
  };

  const startEditingProfileField = (field) => {
        setEditingProfileField(field);
        setProfileNameDraft(profileName || user?.displayName || '');
        setProfileEmailDraft(user?.email || '');
        setCurrentPassword('');
        setNewPassword('');
        setStatus({ type: '', text: '' });
      };

      const handleSaveProfileField = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setStatus({ type: 'error', text: 'Entre novamente para editar seu perfil.' });
          return;
        }

        if (editingProfileField === 'name' && !profileNameDraft.trim()) {
          setStatus({ type: 'error', text: 'Informe seu nome para continuar.' });
          return;
        }

        if (editingProfileField === 'email' && !profileEmailDraft.trim()) {
          setStatus({ type: 'error', text: 'Informe um e-mail válido para continuar.' });
          return;
        }

        if (editingProfileField !== 'name' && !currentPassword) {
          setStatus({ type: 'error', text: 'Informe sua senha atual para confirmar a alteração.' });
          return;
        }

        if (editingProfileField === 'password' && newPassword.length < 6) {
          setStatus({ type: 'error', text: 'A nova senha precisa ter pelo menos 6 caracteres.' });
          return;
        }

        setIsSavingProfile(true);
        try {
          if (editingProfileField === 'name') {
            const normalizedName = profileNameDraft.trim();
            await updateProfile(currentUser, { displayName: normalizedName });
            await setDoc(doc(db, 'profiles', currentUser.uid), { name: normalizedName }, { merge: true });
            setProfileName(normalizedName);
            setStatus({ type: 'success', text: 'Seu nome foi atualizado.' });
          } else {
            const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
            await reauthenticateWithCredential(currentUser, credential);

            if (editingProfileField === 'email') {
              const normalizedEmail = profileEmailDraft.trim();
              await updateEmail(currentUser, normalizedEmail);
              await setDoc(doc(db, 'profiles', currentUser.uid), { email: normalizedEmail }, { merge: true });
              await sendEmailVerification(currentUser);
              setUser(currentUser);
              setStatus({ type: 'success', text: 'E-mail atualizado. Confira sua caixa de entrada para verificá-lo.' });
            } else {
              await updatePassword(currentUser, newPassword);
              setStatus({ type: 'success', text: 'Sua senha foi atualizada.' });
            }
          }

          setEditingProfileField('');
          setCurrentPassword('');
          setNewPassword('');
        } catch (error) {
          setStatus({ type: 'error', text: getFriendlyAuthError(error, 'atualizar seu perfil') });
        } finally {
          setIsSavingProfile(false);
        }
      };
  const openProfile = useCallback(() => {
    navigateTo('profile');
  }, [navigateTo]);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setStatus({ type: 'error', text: 'Preencha nome completo, e-mail e senha para cadastrar.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!getAccountType(normalizedEmail)) {
      setStatus({ type: 'error', text: ACCOUNT_DOMAIN_HINT });
      return;
    }

    if (password.length < 6) {
      setStatus({ type: 'error', text: 'A senha precisa ter pelo menos 6 caracteres.' });
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const normalizedName = fullName.trim();

      await updateProfile(userCredential.user, { displayName: normalizedName });
      await setDoc(doc(db, 'profiles', userCredential.user.uid), {
        name: normalizedName,
        email: userCredential.user.email,
        photoUrl: '',
      });

      setUser(userCredential.user);
      setProfileName(normalizedName);
      setProfileImage('');
      navigateTo('items');
      setStatus({ type: 'success', text: 'Cadastro realizado com sucesso! Bem-vindo(a).' });
      clearForm();
    } catch (error) {
      setStatus({ type: 'error', text: getFriendlyAuthError(error, 'realizar o cadastro') });
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setStatus({ type: 'error', text: 'Informe seu e-mail e senha para entrar.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!getAccountType(normalizedEmail)) {
      setStatus({ type: 'error', text: ACCOUNT_DOMAIN_HINT });
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      setUser(userCredential.user);
      navigateTo('items');
      setStatus({ type: 'success', text: 'Login realizado com sucesso!' });
      clearForm();
    } catch (error) {
      setStatus({ type: 'error', text: getFriendlyAuthError(error, 'fazer login') });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setProfileImage(null);
      setProfileName('');
      navigateTo('items');
      setStatus({ type: 'success', text: 'Você saiu da conta com sucesso.' });
      clearForm();
      setScreen('login');
    } catch (error) {
      setStatus({ type: 'error', text: getFriendlyAuthError(error, 'sair da conta') });
    }
  };

  const handlePickProfileImage = async () => {
    if (isUploading) {
      return;
    }

    let uploadStage = 'image';
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setStatus({ type: 'error', text: 'Permita o acesso às fotos para selecionar uma imagem.' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      const localUri = result.assets[0].uri;
      if (!user) {
        return;
      }

      setIsUploading(true);
      const photoUrl = await uploadImage(localUri, `profile-${user.uid}.jpg`, result.assets[0].file);
      uploadStage = 'profile';
      await setDoc(
        doc(db, 'profiles', user.uid),
        {
          name: profileName || user.displayName || '',
          email: user.email || '',
          photoUrl,
        },
        { merge: true },
      );

      setProfileImage(photoUrl);
      setStatus({ type: 'success', text: 'Foto de perfil salva com sucesso.' });
    } catch (error) {
      console.error(`[${uploadStage === 'image' ? 'IMAGE UPLOAD' : 'PROFILE SAVE'} ERROR]`, error);
      const message = uploadStage === 'image'
        ? `Falha no envio da imagem: ${error?.message || 'erro desconhecido.'}`
        : getFirestoreError(error, 'salvar a foto do perfil');
      setStatus({ type: 'error', text: message });
    } finally {
      setIsUploading(false);
    }
  };

  const handlePickItemImage = async () => {
    if (isUploading) {
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setStatus({ type: 'error', text: 'Permita o acesso às fotos para selecionar uma imagem.' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      const asset = result.assets?.[0];
      if (!result.canceled && asset?.uri) {
        setItemImage(asset.uri);
        setItemImageFile(asset.file || null);
        setStatus({ type: 'success', text: 'Imagem selecionada. Agora basta salvar.' });
      }
    } catch (error) {
      console.error('[UPLOAD ERROR]', error);
      setStatus({ type: 'error', text: 'Erro ao escolher imagem.' });
    }
  };

  const updateItemDate = (field, date) => {
    const value = toStoredDate(date);
    if (field === 'start') {
      setItemDateStart(value);
      if (itemDateEnd && value > itemDateEnd) {
        setItemDateEnd('');
      }
      return;
    }

    setItemDateEnd(value);
  };

  const openItemDatePicker = (field) => {
    setItemDateDraft(fromStoredDate(field === 'start' ? itemDateStart : itemDateEnd));
    setDatePickerField(field);
  };

  const renderDateField = (field, placeholder) => {
    const value = field === 'start' ? itemDateStart : itemDateEnd;
    const dateConstraints = {
      min: field === 'end' ? itemDateStart || undefined : undefined,
      max: field === 'start' ? itemDateEnd || undefined : undefined,
    };

    if (Platform.OS === 'web') {
      return React.createElement('input', {
        type: 'date',
        value,
        ...dateConstraints,
        'aria-label': placeholder,
        onChange: (event) => updateItemDate(field, fromStoredDate(event.target.value)),
        style: {
          boxSizing: 'border-box',
          width: '100%',
          height: '50px',
          marginBottom: '14px',
          padding: '13px 14px',
          border: '1px solid #E5E1EA',
          borderRadius: '12px',
          backgroundColor: theme.colors.surface,
          color: theme.colors.onSurface,
          fontSize: '16px',
        },
      });
    }

    return (
      <TouchableOpacity
        style={styles.input}
        onPress={() => openItemDatePicker(field)}
        accessibilityRole="button"
        accessibilityLabel={value ? `${placeholder}: ${formatStoredDate(value)}` : placeholder}
      >
        <Text style={[styles.dateInputText, !value && styles.dateInputPlaceholder]}>
          {value ? formatStoredDate(value) : placeholder}
        </Text>
      </TouchableOpacity>
    );
  };

  const updateFilterDate = (field, date) => {
    const value = toStoredDate(date);
    if (field === 'start') {
      setFilterDateStart(value);
      if (filterDateEnd && value > filterDateEnd) {
        setFilterDateEnd('');
      }
      return;
    }

    setFilterDateEnd(value);
  };

  const openFilterDatePicker = (field) => {
    setFilterDateDraft(fromStoredDate(field === 'start' ? filterDateStart : filterDateEnd));
    setFilterDatePickerField(field);
  };

  const renderFilterDateField = (field, placeholder) => {
    const value = field === 'start' ? filterDateStart : filterDateEnd;
    const dateConstraints = {
      min: field === 'end' && filterDateStart ? filterDateStart : undefined,
      max: field === 'start' && filterDateEnd ? filterDateEnd : undefined,
    };

    if (Platform.OS === 'web') {
      return React.createElement('input', {
        type: 'date',
        value,
        ...dateConstraints,
        'aria-label': placeholder,
        onChange: (event) => {
          if (event.target.value) {
            updateFilterDate(field, fromStoredDate(event.target.value));
          }
        },
        style: {
          boxSizing: 'border-box',
          width: '100%',
          height: '50px',
          marginBottom: '10px',
          padding: '13px 14px',
          border: '1px solid #E5E1EA',
          borderRadius: '12px',
          backgroundColor: theme.colors.surface,
          color: theme.colors.onSurface,
          fontSize: '16px',
        },
      });
    }

    return (
      <TouchableOpacity
        style={[styles.input, styles.dateFilterInput]}
        onPress={() => openFilterDatePicker(field)}
        accessibilityRole="button"
        accessibilityLabel={value ? `${placeholder}: ${formatStoredDate(value)}` : placeholder}
      >
        <Text style={[styles.dateInputText, !value && styles.dateInputPlaceholder]}>
          {value ? formatStoredDate(value) : placeholder}
        </Text>
      </TouchableOpacity>
    );
  };

  const handleAddItem = async () => {
    if (!itemType) {
      setStatus({ type: 'error', text: 'Selecione o tipo do item.' });
      return;
    }
    if (getAccountType(user?.email) !== 'server' && itemType !== 'lost') {
      setStatus({ type: 'error', text: 'Estudantes só podem cadastrar itens perdidos.' });
      return;
    }
    // Continue with existing validation and save logic
    if (!itemName.trim() || !itemDescription.trim() || !itemLocation.trim() || !itemCategory.trim()) {
      setStatus({ type: 'error', text: 'Preencha todos os campos.' });
      return;
    }

    const eventDateStart = parseDateInput(itemDateStart);
    const eventDateEnd = itemDateMode === 'period' && itemDateEnd.trim()
      ? parseDateInput(itemDateEnd)
      : null;
    if (!eventDateStart || (itemDateMode === 'period' && (!itemDateEnd.trim() || !eventDateEnd))) {
      setStatus({ type: 'error', text: 'Selecione datas válidas.' });
      return;
    }
    if (eventDateEnd && eventDateEnd < eventDateStart) {
      setStatus({ type: 'error', text: 'A data final não pode ser anterior à data inicial.' });
      return;
    }

    if (isUploading) {
      return;
    }

    setIsUploading(true);
    let uploadStage = itemImage ? 'image' : 'item';

    try {
      const imageUrl = itemImage
        ? await uploadImage(itemImage, `item-${Date.now()}.jpg`, itemImageFile)
        : '';
      const safeImageUrl = typeof imageUrl === 'string' ? imageUrl : '';
      console.log('[ANDROID UPLOAD] FIRESTORE SAVE:', safeImageUrl ? 'with image' : 'without image');

      const itemData = {
        name: itemName.trim(),
        description: itemDescription.trim(),
        location: itemLocation.trim(),
        category: itemCategory.trim(),
        type: itemType,
        status: 'active',
        imageUrl: safeImageUrl,
        createdAt: new Date().toISOString(),
        foundAt: new Date().toISOString(),
        ...(itemType === 'found' ? {
          foundAtDaeeAt: new Date().toISOString(),
          foundAtDaeeBy: user.uid,
        } : {}),
        creatorName: profileName || user.displayName || 'Usuário',
        creatorEmail: user.email || '',
        creatorPhotoUrl: profileImage || user.photoURL || '',
        eventDateStart,
        eventDateEnd,
        userId: user ? user.uid : null,
      };

      uploadStage = 'item';
      const itemReference = await addDoc(collection(db, 'items'), itemData);
      setFoundItems((currentItems) => [{ id: itemReference.id, ...itemData }, ...currentItems]);

      setStatus({ type: 'success', text: 'Item cadastrado com sucesso.' });
      setItemName('');
      setItemDescription('');
      setItemLocation('');
      setItemDateStart('');
      setItemDateEnd('');
      setItemDateMode('single');
      setDatePickerField(null);
      setItemCategory('');
      setShowCategoryOptions(false);
      setItemImage(null);
      setItemImageFile(null);
      setItemListFilter(itemType);
      navigateTo('items');
    } catch (error) {
      console.error(`[${uploadStage === 'image' ? 'IMAGE UPLOAD' : 'ITEM SAVE'} ERROR]`, error);
      const message = uploadStage === 'image'
        ? `Falha no envio da imagem: ${error?.message || 'erro desconhecido.'}`
        : getFirestoreError(error, 'salvar o item');
      setStatus({ type: 'error', text: message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddComment = async () => {
    const text = commentText.trim();
    if (!text || !selectedItem?.id || !user || isSubmittingComment) {
      return;
    }

    setIsSubmittingComment(true);
    setCommentsError('');
    try {
      await addDoc(collection(db, 'items', selectedItem.id, 'comments'), {
                userId: user.uid,
                authorName: profileName || user.displayName || user.email || 'Usuário',
                authorPhotoUrl: profileImage || '',
                text,
                createdAt: serverTimestamp(),
              });
      setCommentText('');
    } catch (error) {
      setCommentsError(getFirestoreError(error, 'enviar o comentário'));
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleReportItemFound = async () => {
    const accountType = getAccountType(user?.email);
    const reportKey = user?.uid && selectedItem?.id ? `${user.uid}:${selectedItem.id}` : '';
    if (!reportKey
      || !['student', 'server'].includes(accountType)
      || selectedItem.type !== 'lost'
      || selectedItem.status === 'recovered'
      || !selectedItem.userId
      || selectedItem.userId === user.uid
      || isSendingFoundNotice
      || reportedFoundItemIds.has(reportKey)
      || foundNoticeInFlightRef.current.has(reportKey)) {
      return;
    }

    foundNoticeInFlightRef.current.add(reportKey);
    setIsSendingFoundNotice(true);
    setStatus({ type: '', text: '' });
    try {
      await setDoc(doc(db, 'notificationRequests', selectedItem.id), {
        itemId: selectedItem.id,
        recipientId: selectedItem.userId,
        createdBy: user.uid,
        type: 'item_found',
        title: 'Seu item foi achado',
        body: 'Seu item foi achado.',
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setReportedFoundItemIds((currentIds) => new Set(currentIds).add(reportKey));
      setStatus({
        type: 'success',
        text: 'Solicitação registrada no Firestore. A notificação e a visualização para servidores ainda não estão configuradas neste projeto.',
      });
    } catch (error) {
      const message = error?.code === 'permission-denied'
        ? 'Não foi possível registrar. A solicitação pode já existir para este item ou as regras atuais podem bloquear a gravação.'
        : getFirestoreError(error, 'registrar o aviso');
      setStatus({ type: 'error', text: message });
    } finally {
      foundNoticeInFlightRef.current.delete(reportKey);
      setIsSendingFoundNotice(false);
    }
  };

  const handleMarkRecovered = async () => {
    if (!selectedItem?.id
      || selectedItem.type !== 'found'
      || selectedItem.status === 'recovered'
      || getAccountType(user.email) !== 'server'
      || isMarkingRecovered) {
      return;
    }

    const claimantName = recoveredPersonName.trim();
    const claimantClass = recoveredPersonClass.trim();
    const claimantEnrollment = recoveredPersonEnrollment.trim();
    if (!claimantName || !claimantClass || !claimantEnrollment) {
      setStatus({ type: 'error', text: 'Informe o nome, a turma e a matrícula de quem recuperou o item.' });
      return;
    }

    setIsMarkingRecovered(true);
    const recoveredData = {
      type: 'recovered',
      status: 'recovered',
      recoveredAt: serverTimestamp(),
      recoveredByUid: user.uid,
      recoveredByName: profileName || user.displayName || user.email,
      recoveredByEmail: user.email || '',
      recoveredByPhotoUrl: profileImage || '',
    };
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'items', selectedItem.id), recoveredData);
      batch.set(doc(db, 'items', selectedItem.id, 'recoveryDetails', 'claimant'), {
        name: claimantName,
        class: claimantClass,
        enrollment: claimantEnrollment,
        recordedAt: serverTimestamp(),
      });
      await batch.commit();
      const updatedItem = {
        ...selectedItem,
        ...recoveredData,
        recoveredAt: new Date(),
      };
      setSelectedItem(updatedItem);
      setFoundItems((currentItems) => currentItems.map((item) => (
        item.id === selectedItem.id ? updatedItem : item
      )));
      setItemListFilter('recovered');
      setIsRecoveryFormVisible(false);
      setRecoveredPersonName('');
      setRecoveredPersonClass('');
      setRecoveredPersonEnrollment('');
      setStatus({ type: 'success', text: 'Item marcado como recuperado.' });
    } catch (error) {
      setStatus({ type: 'error', text: getFirestoreError(error, 'marcar o item como recuperado') });
    } finally {
      setIsMarkingRecovered(false);
    }
  };

  const handleMarkItemFound = async () => {
    if (selectedItem?.type !== 'lost' || !canManageSelectedItem || isRegisteringPickup) {
      return;
    }

    setIsRegisteringPickup(true);
    setPickupError('');
    const foundAtDaeeAt = new Date().toISOString();
    const statusData = {
      type: 'found',
      foundAtDaeeAt: serverTimestamp(),
      foundAtDaeeBy: user.uid,
    };

    try {
      await updateDoc(doc(db, 'items', selectedItem.id), statusData);
      const updatedItem = { ...selectedItem, ...statusData, foundAtDaeeAt };
      setSelectedItem(updatedItem);
      setFoundItems((items) => items.map((item) => (
        item.id === selectedItem.id ? updatedItem : item
      )));
      setItemListFilter('found');
    } catch (error) {
      setPickupError(getFirestoreError(error, 'registrar a chegada ao Achados e Perdidos'));
    } finally {
      setIsRegisteringPickup(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) {
      setStatus({ type: 'error', text: 'Nenhuma conta ativa para excluir.' });
      setConfirmDelete(false);
      return;
    }

    try {
      const userId = auth.currentUser.uid;
      await deleteUser(auth.currentUser);
      await deleteDoc(doc(db, 'profiles', userId));
      setUser(null);
      setProfileImage(null);
      setProfileName('');
      navigateTo('items');
      setStatus({ type: 'success', text: 'Sua conta foi excluída com sucesso.' });
      clearForm();
      setScreen('login');
      setConfirmDelete(false);
    } catch (error) {
      const code = error?.code || '';
      if (code === 'auth/requires-recent-login') {
        setStatus({ type: 'error', text: 'Para excluir a conta, faça login novamente e tente outra vez.' });
      } else {
        setStatus({ type: 'error', text: getFriendlyAuthError(error, 'excluir a conta') });
      }
      setConfirmDelete(false);
    }
  };

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    return foundItems.filter((item) => {
      const matchesCategory = selectedCategory === 'Todas'
        || normalizeItemCategory(item.category) === selectedCategory;
      const itemDateStart = item.eventDateStart;
      const itemDateEnd = item.eventDateEnd || itemDateStart;
      const matchesDate = !hasDateFilter || (itemDateStart && (
        filterDateMode === 'single'
          ? itemDateStart <= filterDateStart && itemDateEnd >= filterDateStart
          : itemDateEnd >= (filterDateStart || '0000-01-01')
            && itemDateStart <= (filterDateEnd || '9999-12-31')
      ));
      const searchableText = `${item.name || ''} ${item.description || ''} ${item.location || ''} ${item.category || ''}`.toLocaleLowerCase();
      return matchesCategory && matchesDate && searchableText.includes(normalizedQuery);
    });
  }, [foundItems, searchQuery, selectedCategory, hasDateFilter, filterDateMode, filterDateStart, filterDateEnd]);

  const filteredItemsByType = useMemo(() => ({
    lost: filteredItems.filter((item) => (item.type || 'found') === 'lost'),
    found: filteredItems.filter((item) => (item.type || 'found') === 'found'),
    recovered: filteredItems.filter((item) => item.type === 'recovered' || item.status === 'recovered'),
  }), [filteredItems]);

  const displayedItems = useMemo(() => {
    const items = filteredItemsByType[itemListFilter];
    if (oldItemFilter === 'all') {
      return items;
    }
    const expectedLabel = oldItemFilter === 'lost'
      ? 'Perdido há muito tempo'
      : 'Achado há muito tempo';
    return items.filter((item) => getOldItemLabel(item, currentTime) === expectedLabel);
  }, [filteredItemsByType, itemListFilter, oldItemFilter, currentTime]);

  const myItemsOnly = useMemo(
    () => filteredItems.filter((item) => item.userId === user?.uid),
    [filteredItems, user?.uid],
  );

  const renderItemList = useCallback((items, type, ownItemsOnly = false) => {
    if (!items.length) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateMark}>◎</Text>
          <Text style={styles.cardTitle}>
            {ownItemsOnly ? 'Você ainda não publicou nenhum item' : type === 'lost' ? 'Nenhum item perdido por aqui' : 'Nenhum item encontrado'}
          </Text>
          <Text style={styles.cardText}>Tente ajustar a busca ou confira novamente mais tarde.</Text>
        </View>
      );
    }
    return (
      <View style={styles.itemGrid}>
        {items.map((item) => {
          const itemStatus = item.status === 'recovered' ? 'recovered' : item.type || 'found';
          const oldItemLabel = getOldItemLabel(item, currentTime);
          const statusLabel = { lost: 'Perdido', found: 'Achado', recovered: 'Recuperado' }[itemStatus] || 'Achado';
          const statusStyle = itemStatus === 'lost'
            ? styles.itemTypeBadgeLost
            : itemStatus === 'recovered' ? styles.itemTypeBadgeRecovered : styles.itemTypeBadgeFound;
          const statusTextStyle = itemStatus === 'lost'
            ? styles.itemTypeBadgeTextLost
            : itemStatus === 'recovered' ? styles.itemTypeBadgeTextRecovered : styles.itemTypeBadgeTextFound;
          const itemDateLabel = item.eventDateStart
            ? `${formatStoredDate(item.eventDateStart)}${item.eventDateEnd ? ` até ${formatStoredDate(item.eventDateEnd)}` : ''}`
            : '';
          const statusDetail = itemStatus === 'recovered'
            ? `Retirado por ${item.pickedUpBy || item.recoveredByName || 'não informado'} - ${formatItemTimestamp(item.pickedUpAt || item.recoveredAt)}`
            : itemStatus === 'found' && item.foundAtDaeeAt
              ? `Na DAEE desde ${formatItemTimestamp(item.foundAtDaeeAt)}`
              : '';

          return (
            <TouchableOpacity
              key={item.id}
              style={styles.itemCard}
              onPress={() => {
                setSelectedItem(item);
                setItemComments([]);
                setCommentsError('');
                setLoadedCommentsForItemId(null);
                setCommentText('');
                setIsRecoveryFormVisible(false);
                setRecoveredPersonName('');
                setRecoveredPersonClass('');
                setRecoveredPersonEnrollment('');
                navigateTo('itemDetail');
              }}
              accessibilityRole="button"
              accessibilityLabel={`Ver detalhes de ${item.name}, categoria ${normalizeItemCategory(item.category)}`}
            >
              <View style={styles.itemImageWrapper}>
                ? <Image source={{ uri: item.imageUrl }} style={styles.itemImage} resizeMode="cover" />
                : <View style={styles.itemImagePlaceholder}><Text style={styles.placeholderMark}>◎</Text></View>}
              <View style={styles.itemCardContent}>
                <View style={[styles.itemTypeBadge, statusStyle]}>
                  <Text style={[styles.itemTypeBadgeText, statusTextStyle]}>{statusLabel}</Text>
                </View>
                {oldItemLabel ? (
                  <View style={styles.oldItemBadge}>
                    <Text style={styles.oldItemBadgeText}>{oldItemLabel}</Text>
                  </View>
                ) : null}
                <Text style={styles.itemCategoryBadgeText} numberOfLines={1}>
                  {getCategoryOption(item.category).symbol} {normalizeItemCategory(item.category)}
                </Text>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemLocation} numberOfLines={1}>{item.location}</Text>
                {itemDateLabel ? <Text style={styles.itemDate} numberOfLines={1}>Data: {itemDateLabel}</Text> : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }, [navigateTo, currentTime]);

  if (user) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar style="dark" />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={styles.appShell}>
              <ScrollView
                ref={scrollViewRef}
                style={styles.screenScroll}
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                onScroll={(event) => setShowScrollTop(event.nativeEvent.contentOffset.y > 220)}
                scrollEventThrottle={16}
              >
                {activeView === 'items' && (
                  <>
                    <Text style={styles.eyebrow}>ACHADOS &amp; PERDIDOS</Text>
                    <Text style={styles.title}>Itens</Text>
                    <View style={styles.myItemsFilterRow}>
                      {[
                        { key: 'lost', label: 'Perdidos' },
                        { key: 'found', label: 'Achados' },
                        { key: 'recovered', label: 'Recuperados' },
                      ].map((filter) => (
                        <TouchableOpacity key={filter.key} style={[styles.myItemsFilter, itemListFilter === filter.key && styles.myItemsFilterActive]} onPress={() => { setItemListFilter(filter.key); setOldItemFilter('all'); }}>
                          <Text style={[styles.myItemsFilterText, itemListFilter === filter.key && styles.myItemsFilterTextActive]}>{filter.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <ScrollView horizontal contentContainerStyle={styles.categoryRow} showsHorizontalScrollIndicator={false}>
                      {[
                        { key: 'all', label: 'Todos' },
                        { key: 'lost', label: 'Perdido há muito tempo' },
                        { key: 'found', label: 'Achado há muito tempo' },
                      ].map((filter) => (
                        <TouchableOpacity
                          key={filter.key}
                          style={[styles.categoryChip, oldItemFilter === filter.key && styles.categoryChipActive]}
                          onPress={() => {
                            setOldItemFilter(filter.key);
                            if (filter.key !== 'all') {
                              setItemListFilter(filter.key);
                            }
                          }}
                        >
                          <Text style={[styles.categoryChipText, oldItemFilter === filter.key && styles.categoryChipTextActive]}>
                            {filter.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <View style={styles.searchBox}>
                      <TextInput style={styles.searchInput} placeholder="Buscar por nome, local..." value={searchQuery} onChangeText={setSearchQuery} />
                      <TouchableOpacity style={styles.categoryFilterButton} onPress={() => setShowCategoryFilters((value) => !value)}>
                        <Text>☷</Text>
                      </TouchableOpacity>
                    </View>
                    {showCategoryFilters && (
                      <>
                        <ScrollView horizontal contentContainerStyle={styles.categoryRow}>
                          {categoryOptions.map((category) => (
                            <TouchableOpacity key={category} style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]} onPress={() => setSelectedCategory(category)}>
                              <Text style={[styles.categoryChipText, selectedCategory === category && styles.categoryChipTextActive]}>{category}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                        <View style={styles.dateFilterPanel}>
                          <Text style={styles.dateFilterTitle}>Data da ocorrência</Text>
                          <View style={styles.authModeRow}>
                            {[
                              { key: 'single', label: 'Uma data' },
                              { key: 'period', label: 'Período' },
                            ].map((mode) => (
                              <TouchableOpacity
                                key={mode.key}
                                style={[styles.authModeButton, filterDateMode === mode.key && styles.authModeButtonActive]}
                                onPress={() => {
                                  setFilterDateMode(mode.key);
                                  if (mode.key === 'single') setFilterDateEnd('');
                                  setFilterDatePickerField(null);
                                }}
                              >
                                <Text style={[styles.authModeText, filterDateMode === mode.key && styles.authModeTextActive]}>{mode.label}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          {renderFilterDateField('start', filterDateMode === 'single' ? 'Escolha uma data' : 'A partir de')}
                          {filterDateMode === 'period' && renderFilterDateField('end', 'Até')}
                          {filterDatePickerField ? (
                            <>
                              <DateTimePicker
                                value={filterDateDraft}
                                mode="date"
                                display={Platform.OS === 'android' ? 'default' : 'spinner'}
                                presentation={Platform.OS === 'android' ? 'dialog' : 'inline'}
                                locale="pt-BR"
                                minimumDate={filterDatePickerField === 'end' && filterDateStart ? fromStoredDate(filterDateStart) : undefined}
                                maximumDate={filterDatePickerField === 'start' && filterDateEnd ? fromStoredDate(filterDateEnd) : undefined}
                                positiveButton={{ label: 'Confirmar' }}
                                negativeButton={{ label: 'Cancelar' }}
                                onValueChange={(_event, date) => {
                                  if (!date) return;
                                  if (Platform.OS === 'android') {
                                    updateFilterDate(filterDatePickerField, date);
                                    setFilterDatePickerField(null);
                                  } else {
                                    setFilterDateDraft(date);
                                  }
                                }}
                                onDismiss={() => setFilterDatePickerField(null)}
                              />
                              {Platform.OS !== 'android' && (
                                <View style={styles.datePickerPanel}>
                                  <View style={styles.datePickerActions}>
                                    <TouchableOpacity style={styles.datePickerCancel} onPress={() => setFilterDatePickerField(null)}>
                                      <Text style={styles.datePickerCancelText}>Cancelar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      style={styles.datePickerConfirm}
                                      onPress={() => {
                                        updateFilterDate(filterDatePickerField, filterDateDraft);
                                        setFilterDatePickerField(null);
                                      }}
                                    >
                                      <Text style={styles.datePickerDoneText}>Confirmar</Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              )}
                            </>
                          ) : null}
                          {hasDateFilter ? (
                            <TouchableOpacity onPress={() => { setFilterDateStart(''); setFilterDateEnd(''); setFilterDatePickerField(null); }}>
                              <Text style={styles.dateFilterClear}>Limpar datas</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </>
                    )}
                    <View style={styles.sectionHeading}>
                      <Text style={styles.sectionHeadingTitle}>{itemListFilter === 'lost' ? 'Itens perdidos' : itemListFilter === 'found' ? 'Itens achados' : 'Itens recuperados'}</Text>
                      <Text style={styles.resultCount}>{displayedItems.length} itens</Text>
                    </View>
                    {renderItemList(displayedItems, itemListFilter)}
                  </>
                )}

                {activeView === 'itemDetail' && selectedItem && (
                  <View>
                    <TouchableOpacity style={styles.detailBackButton} onPress={() => navigateTo('items')}>
                      <Text style={styles.detailBackText}>‹ Voltar aos itens</Text>
                    </TouchableOpacity>
                    {selectedItem.imageUrl ? <Image source={{ uri: selectedItem.imageUrl }} style={styles.detailImage} resizeMode="cover" /> : null}
                    <View style={styles.detailInformation}>
                      <Text style={styles.detailType}>{selectedItem.status === 'recovered' ? 'ITEM RECUPERADO' : selectedItem.type === 'lost' ? 'ITEM PERDIDO' : 'ITEM ACHADO'}</Text>
                      {getOldItemLabel(selectedItem, currentTime) ? (
                        <View style={styles.oldItemBadge}>
                          <Text style={styles.oldItemBadgeText}>{getOldItemLabel(selectedItem, currentTime)}</Text>
                        </View>
                      ) : null}
                      <Text style={styles.detailTitle}>{selectedItem.name}</Text>
                      <Text style={styles.detailDescription}>{selectedItem.description}</Text>
                      <Text style={styles.detailLabel}>Local</Text>
                      <Text style={styles.detailValue}>{selectedItem.location}</Text>
                      <Text style={styles.detailLabel}>Categoria</Text>
                      <Text style={styles.detailValue}>{normalizeItemCategory(selectedItem.category)}</Text>
                      {selectedItem.status === 'recovered' ? (
                        <>
                          <Text style={styles.detailLabel}>Recuperado em</Text>
                          <Text style={styles.detailValue}>{formatDateTime(selectedItem.recoveredAt)}</Text>
                          <Text style={styles.detailLabel}>Registrado por</Text>
                          <View style={styles.recoveredByRow}>
                            <Image
                              source={selectedItem.recoveredByPhotoUrl ? { uri: selectedItem.recoveredByPhotoUrl } : DEFAULT_PROFILE_IMAGE}
                              style={styles.recoveredByAvatar}
                              resizeMode="cover"
                            />
                            <View style={styles.recoveredByInfo}>
                              <Text style={styles.detailValue}>{selectedItem.recoveredByName || 'Servidor'}</Text>
                              {selectedItem.recoveredByEmail ? <Text style={styles.recoveredByEmail}>{selectedItem.recoveredByEmail}</Text> : null}
                            </View>
                          </View>
                          {isLoadingRecoveryPerson ? <ActivityIndicator color="#6336C8" /> : null}
                          {canViewRecoveryPerson && recoveryPersonItemId === selectedItem.id && recoveryPerson ? (
                            <View style={styles.recoveredPersonDetails}>
                              <Text style={styles.detailLabel}>Quem recuperou</Text>
                              <Text style={styles.detailValue}>{recoveryPerson.name}</Text>
                              <Text style={styles.recoveredPersonMeta}>Turma: {recoveryPerson.class}</Text>
                              <Text style={styles.recoveredPersonMeta}>Matrícula: {recoveryPerson.enrollment}</Text>
                            </View>
                          ) : null}
                        </>
                      ) : null}
                      <View style={styles.creatorSection}>
                        <Image
                          source={selectedItem.creatorPhotoUrl ? { uri: selectedItem.creatorPhotoUrl } : DEFAULT_PROFILE_IMAGE}
                          style={styles.creatorAvatar}
                          resizeMode="cover"
                        />
                        <View style={styles.creatorText}>
                          <Text style={styles.creatorLabel}>Cadastrado por</Text>
                          <Text style={styles.creatorName}>{selectedItem.creatorName || 'Autor não informado'}</Text>
                          <Text style={styles.creatorEmail}>{formatDisplayEmail(selectedItem.creatorEmail) || 'E-mail indisponível'}</Text>
                        </View>
                      </View>
                      {selectedItem.type === 'lost' && canManageSelectedItem ? (
                        <View>
                          {pickupError ? <Text style={styles.errorText}>{pickupError}</Text> : null}
                          <TouchableOpacity style={styles.foundButton} onPress={handleMarkItemFound} disabled={isRegisteringPickup}>
                            {isRegisteringPickup ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Registrar como achado</Text>}
                          </TouchableOpacity>
                        </View>
                      ) : null}
                      {selectedItem.type === 'lost' && selectedItem.status !== 'recovered' && selectedItem.userId !== user.uid ? (
                        <TouchableOpacity
                          style={[styles.foundButton, (isSendingFoundNotice || reportedFoundItemIds.has(`${user.uid}:${selectedItem.id}`)) && styles.buttonDisabled]}
                          onPress={handleReportItemFound}
                          disabled={isSendingFoundNotice || reportedFoundItemIds.has(`${user.uid}:${selectedItem.id}`)}
                        >
                          {isSendingFoundNotice
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.buttonText}>{reportedFoundItemIds.has(`${user.uid}:${selectedItem.id}`) ? 'Solicitação registrada' : 'Achei'}</Text>}
                        </TouchableOpacity>
                      ) : null}
                      {selectedItem.type === 'found' && getAccountType(user.email) === 'server' && selectedItem.status !== 'recovered' ? (
                        isRecoveryFormVisible ? (
                          <View style={styles.recoveryForm}>
                            <Text style={styles.commentsTitle}>Dados de quem recuperou</Text>
                            <TextInput style={styles.input} placeholder="Nome completo" value={recoveredPersonName} onChangeText={setRecoveredPersonName} />
                            <TextInput style={styles.input} placeholder="Turma" value={recoveredPersonClass} onChangeText={setRecoveredPersonClass} />
                            <TextInput style={styles.input} placeholder="Matrícula" value={recoveredPersonEnrollment} onChangeText={setRecoveredPersonEnrollment} />
                            <TouchableOpacity style={styles.recoveredButton} onPress={handleMarkRecovered} disabled={isMarkingRecovered}>
                              {isMarkingRecovered ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Marcar como recuperado</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.cancelRecoveryButton} onPress={() => setIsRecoveryFormVisible(false)} disabled={isMarkingRecovered}>
                              <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.recoveredButton} onPress={() => setIsRecoveryFormVisible(true)}>
                            <Text style={styles.buttonText}>Marcar como recuperado</Text>
                          </TouchableOpacity>
                        )
                      ) : null}
                      <View style={styles.commentsSection}>
                        <Text style={styles.commentsTitle}>Comentários ({itemComments.length})</Text>
                        {commentsError ? <Text style={styles.errorText}>{commentsError}</Text> : null}
                        {isLoadingComments ? <ActivityIndicator color="#6336C8" /> : null}
                        <TextInput style={styles.commentInput} placeholder="Escreva um comentário..." value={commentText} onChangeText={setCommentText} multiline />
                        <TouchableOpacity style={styles.commentSubmitButton} onPress={handleAddComment} disabled={isSubmittingComment}>
                          {isSubmittingComment ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Comentar</Text>}
                        </TouchableOpacity>
                        {!isLoadingComments && !itemComments.length && !commentsError ? <Text style={styles.emptyComments}>Ainda não há comentários. Comece a conversa.</Text> : null}
                        {itemComments.map((comment) => <CommentItem key={comment.id} comment={comment} itemId={selectedItem.id} user={user} profileName={profileName} profileImage={profileImage} />)}
                      </View>
                    </View>
                  </View>
                )}

                {activeView === 'profile' && (
                  <View style={styles.profileScreen}>
                    <Text style={styles.title}>Meu perfil</Text>
                    <Text style={styles.profileTypeTitle}>{getAccountType(user.email) === 'server' ? 'Perfil do Servidor' : 'Perfil do Aluno'}</Text>
                    <TouchableOpacity onPress={handlePickProfileImage} disabled={isUploading}>
                      <Image source={profileImage ? { uri: profileImage } : DEFAULT_PROFILE_IMAGE} style={styles.profileImageHome} resizeMode="cover" />
                    </TouchableOpacity>
                    <Text style={styles.userText}>{profileName || user.displayName || 'Minha conta'}</Text>
                    <Text style={styles.profileEmail}>{formatDisplayEmail(user.email)}</Text>
                    <TouchableOpacity style={styles.profileAction} onPress={() => navigateTo('myItems')}><Text style={styles.profileActionTitle}>Meus itens</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.profileAction} onPress={() => navigateTo('settings')}><Text style={styles.profileActionTitle}>Configurações</Text></TouchableOpacity>
                  </View>
                )}

                {activeView === 'myItems' && (
                  <View>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigateTo('profile')}><Text style={styles.backButtonText}>‹</Text></TouchableOpacity>
                    <Text style={styles.title}>Meus itens</Text>
                    <View style={styles.myItemsFilterRow}>
                      {[
                        { key: 'all', label: 'Todos' },
                        { key: 'lost', label: 'Perdidos' },
                        { key: 'found', label: 'Achados' },
                        { key: 'recovered', label: 'Recuperados' },
                      ].map((filter) => (
                        <TouchableOpacity
                          key={filter.key}
                          style={[styles.myItemsFilter, myItemFilter === filter.key && styles.myItemsFilterActive]}
                          onPress={() => setMyItemFilter(filter.key)}
                        >
                          <Text style={[styles.myItemsFilterText, myItemFilter === filter.key && styles.myItemsFilterTextActive]}>
                            {filter.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {renderItemList(
                      myItemsOnly.filter((item) => myItemFilter === 'all'
                        || (myItemFilter === 'recovered'
                          ? item.type === 'recovered' || item.status === 'recovered'
                          : (item.type || 'found') === myItemFilter)),
                      myItemFilter,
                      true,
                    )}
                  </View>
                )}

                {activeView === 'settings' && (
                  <View>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigateTo('profile')}><Text style={styles.backButtonText}>‹</Text></TouchableOpacity>
                    <Text style={styles.title}>Configurações</Text>
                    <TouchableOpacity style={styles.settingsOption} onPress={() => startEditingProfileField('name')}><Text>Nome: {profileName || user.displayName}</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.settingsOption} onPress={() => startEditingProfileField('email')}><Text>E-mail: {formatDisplayEmail(user.email)}</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.settingsOption} onPress={() => startEditingProfileField('password')}><Text>Alterar senha</Text></TouchableOpacity>
                    {editingProfileField ? (
                      <View style={styles.profileEditForm}>
                        {editingProfileField === 'name' ? <TextInput style={styles.input} placeholder="Seu nome" value={profileNameDraft} onChangeText={setProfileNameDraft} /> : null}
                        {editingProfileField === 'email' ? <TextInput style={styles.input} placeholder="Novo e-mail" value={profileEmailDraft} onChangeText={setProfileEmailDraft} /> : null}
                        {editingProfileField === 'password' ? <TextInput style={styles.input} placeholder="Nova senha" value={newPassword} onChangeText={setNewPassword} secureTextEntry /> : null}
                        {editingProfileField !== 'name' ? <TextInput style={styles.input} placeholder="Senha atual" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry /> : null}
        <ButtonPrimary onPress={handleSaveProfileField} style={[styles.buttonPrimary, isSavingProfile && styles.buttonDisabled]} disabled={isSavingProfile}> {isSavingProfile ? <ActivityIndicator color="#fff" /> : 'Salvar alteração'} </ButtonPrimary>
                      </View>
                    ) : null}
                    <TouchableOpacity style={styles.buttonLogout} onPress={handleLogout}><Text style={styles.buttonLogoutText}>Sair da conta</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.buttonDelete} onPress={() => setConfirmDelete(true)}><Text style={styles.buttonDeleteText}>Excluir conta</Text></TouchableOpacity>
                    {confirmDelete ? (
                      <View style={styles.confirmBox}>
                        <Text style={styles.confirmTitle}>Confirmar exclusão</Text>
                        <Text style={styles.confirmText}>Essa ação apagará sua conta permanentemente. Deseja continuar?</Text>
                        <TouchableOpacity style={styles.confirmDeleteButton} onPress={handleDeleteAccount}><Text style={styles.buttonText}>Excluir</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => setConfirmDelete(false)}><Text>Cancelar</Text></TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                )}

                {activeView === 'addItem' && (
                  <View>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigateTo('items')}><Text style={styles.backButtonText}>‹</Text></TouchableOpacity>
                    <Text style={styles.title}>Cadastrar item</Text>
                    {getAccountType(user.email) === 'server' ? (
                      <View style={styles.authModeRow}>
                        {['lost', 'found'].map((type) => <TouchableOpacity key={type} style={styles.authModeButton} onPress={() => setItemType(type)}><Text>{type === 'lost' ? 'Perdido' : 'Achado'}</Text></TouchableOpacity>)}
                      </View>
                    ) : null}
                    <TextInput style={styles.input} placeholder="Nome" value={itemName} onChangeText={setItemName} />
                    <TextInput style={styles.input} placeholder="Descrição" value={itemDescription} onChangeText={setItemDescription} />
                    <TextInput style={styles.input} placeholder="Localização" value={itemLocation} onChangeText={setItemLocation} />
                    <View style={styles.authModeRow}>
                      {[
                        { key: 'single', label: 'Uma data' },
                        { key: 'period', label: 'Período' },
                      ].map((mode) => (
                        <TouchableOpacity
                          key={mode.key}
                          style={[styles.authModeButton, itemDateMode === mode.key && styles.authModeButtonActive]}
                          onPress={() => {
                            setItemDateMode(mode.key);
                            setDatePickerField(null);
                            if (mode.key === 'single') setItemDateEnd('');
                          }}
                        >
                          <Text style={[styles.authModeText, itemDateMode === mode.key && styles.authModeTextActive]}>{mode.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {renderDateField('start', itemDateMode === 'period' ? 'Data inicial' : 'Data da ocorrência')}
                    {itemDateMode === 'period' && renderDateField('end', 'Data final')}
                    {datePickerField ? (
                      <>
                        <DateTimePicker
                          value={itemDateDraft}
                          mode="date"
                          display={Platform.OS === 'android' ? 'default' : 'spinner'}
                          presentation={Platform.OS === 'android' ? 'dialog' : 'inline'}
                          locale="pt-BR"
                          minimumDate={datePickerField === 'end' && itemDateStart ? fromStoredDate(itemDateStart) : undefined}
                          maximumDate={datePickerField === 'start' && itemDateEnd ? fromStoredDate(itemDateEnd) : undefined}
                          positiveButton={{ label: 'Confirmar' }}
                          negativeButton={{ label: 'Cancelar' }}
                          onValueChange={(_event, date) => {
                            if (!date) return;
                            if (Platform.OS === 'android') {
                              updateItemDate(datePickerField, date);
                              setDatePickerField(null);
                            } else {
                              setItemDateDraft(date);
                            }
                          }}
                          onDismiss={() => setDatePickerField(null)}
                        />
                        {Platform.OS !== 'android' && (
                          <View style={styles.datePickerPanel}>
                            <View style={styles.datePickerActions}>
                              <TouchableOpacity style={styles.datePickerCancel} onPress={() => setDatePickerField(null)}>
                                <Text style={styles.datePickerCancelText}>Cancelar</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.datePickerConfirm}
                                onPress={() => {
                                  updateItemDate(datePickerField, itemDateDraft);
                                  setDatePickerField(null);
                                }}
                              >
                                <Text style={styles.datePickerDoneText}>Confirmar</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </>
                    ) : null}
                    <TouchableOpacity style={styles.categoryPicker} onPress={() => setShowCategoryOptions((value) => !value)}><Text>{itemCategory || 'Selecionar categoria'}</Text></TouchableOpacity>
                    {showCategoryOptions ? (
                      <View style={styles.categoryOptions}>
                        {ITEM_CATEGORIES.map((category) => <TouchableOpacity key={category.label} style={styles.categoryOption} onPress={() => { setItemCategory(category.label); setShowCategoryOptions(false); }}><Text>{category.symbol} {category.label}</Text></TouchableOpacity>)}
                      </View>
                    ) : null}
                    <ButtonPrimary onPress={handlePickItemImage} disabled={isUploading} style={styles.buttonPrimary}>Selecionar imagem</ButtonPrimary>
                    {itemImage ? (
                      <View style={styles.itemPreviewWrap}>
                        <Image source={{ uri: itemImage }} style={styles.itemPreview} />
                        <TouchableOpacity style={styles.removeImageButton} onPress={() => { setItemImage(null); setItemImageFile(null); }}>
                          <Text style={styles.removeImageText}>Remover imagem</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                    <ButtonPrimary onPress={handleAddItem} disabled={isUploading} style={styles.buttonPrimary}>{isUploading ? <ActivityIndicator color="#fff" /> : 'Salvar'}</ButtonPrimary>
                  </View>
                )}
                {status.text ? <Text style={[styles.message, status.type === 'error' ? styles.errorText : styles.successText]}>{status.text}</Text> : null}
              </ScrollView>
              {(isItemListView || showScrollTop) && (
                <View style={styles.floatingActions}>
                  {isItemListView ? <TouchableOpacity style={styles.floatingAddButton} onPress={() => { setItemType('lost'); navigateTo('addItem'); }}><Text style={styles.floatingAddButtonText}>+</Text></TouchableOpacity> : null}
                  {showScrollTop ? <TouchableOpacity style={styles.scrollTopButton} onPress={() => scrollViewRef.current?.scrollTo({ y: 0, animated: true })}><Text style={styles.scrollTopText}>↑</Text></TouchableOpacity> : null}
                </View>
              )}
              <View style={styles.bottomBar}>
                <TouchableOpacity
                  style={[styles.bottomNavButton, activeNavigationView === 'items' && styles.bottomNavButtonActive]}
                  onPress={() => navigateTo('items')}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activeNavigationView === 'items' }}
                >
                  <Text style={[styles.bottomNavText, activeNavigationView === 'items' && styles.bottomNavTextActive]}>Itens</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.bottomNavButton, activeNavigationView === 'profile' && styles.bottomNavButtonActive]}
                  onPress={openProfile}
                  accessibilityRole="button"
                  accessibilityLabel="Perfil"
                  accessibilityState={{ selected: activeNavigationView === 'profile' }}
                >
                  <Image source={profileImage ? { uri: profileImage } : DEFAULT_PROFILE_IMAGE} style={styles.profileAvatar} resizeMode="cover" />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.authContent}>
              <Text style={styles.eyebrow}>COMUNIDADE LOCAL</Text>
              <Text style={styles.authTitle}>Achados e Perdidos</Text>
              <Text style={styles.authIntro}>Um jeito simples de reencontrar o que importa.</Text>
              <View style={styles.authModeRow}>
                <TouchableOpacity style={[styles.authModeButton, screen === 'login' && styles.authModeButtonActive]} onPress={() => setScreen('login')}><Text style={styles.authModeText}>Entrar</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.authModeButton, screen === 'register' && styles.authModeButtonActive]} onPress={() => setScreen('register')}><Text style={styles.authModeText}>Criar conta</Text></TouchableOpacity>
              </View>
              {screen === 'login' ? (
                <View style={styles.formBox}>
                  <Text style={styles.sectionTitle}>Boas-vindas</Text>
                  <TextField style={styles.input} placeholder="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="words" />
                  <Text style={styles.authHint}>{ACCOUNT_DOMAIN_HINT}</Text>
                  <TextField style={styles.input} placeholder="Senha" value={password} onChangeText={setPassword} secureTextEntry />
                  <ButtonPrimary onPress={handleLogin} style={styles.buttonPrimary}>Entrar</ButtonPrimary>
                </View>
              ) : (
                <View style={styles.formBox}>
                  <Text style={styles.sectionTitle}>Criar sua conta</Text>
                  <TextInput style={styles.input} placeholder="Nome completo" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
                  <TextField style={styles.input} placeholder="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="words" />
                  <Text style={styles.authHint}>{ACCOUNT_DOMAIN_HINT}</Text>
                  <TextInput style={styles.input} placeholder="Senha (mínimo 6 caracteres)" value={password} onChangeText={setPassword} secureTextEntry />
                  <ButtonPrimary onPress={handleRegister} style={styles.buttonPrimary}>Criar conta</ButtonPrimary>
                </View>
              )}
              {status.text ? <Text style={[styles.message, status.type === 'error' ? styles.errorText : styles.successText]}>{status.text}</Text> : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  screenScroll: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: theme.colors.background,
  },
  containerWithFloatingActions: {
    paddingBottom: 104,
  },
  authContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  authContent: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
    authTitle: {
      color: theme.colors.onSurface,
      fontSize: 30,
      fontWeight: '800',
      marginBottom: 6,
    },
  authIntro: {
    color: '#77727F',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  authFormIntro: {
    color: '#77727F',
    fontSize: theme.typography.labelMedium.fontSize,
    marginTop: -10,
    marginBottom: 18,
  },
  authModeRow: {
    minHeight: 52,
    flexDirection: 'row',
    backgroundColor: '#ECE9F0',
    borderRadius: 15,
    padding: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  authModeButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.shape.large,
  },
  authModeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  authModeText: {
    color: '#77727F',
    fontWeight: '700',
  },
  authModeTextActive: {
    color: theme.colors.surface,
  },
  backButton: {
    alignSelf: 'flex-start',
    width: 42,
    height: 42,
    borderRadius: theme.shape.large,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0EBF8',
    marginBottom: 12,
  },
  backButtonText: {
    color: theme.colors.primary,
    fontSize: 25,
    lineHeight: 28,
  },
  profileImageButton: {
    alignSelf: 'center',
    borderRadius: 72,
    borderWidth: 4,
    borderColor: '#E5E1EA',
    marginBottom: 10,
  },
  profileImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  profileImageHome: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0EBF8',
  },
  changeImageText: {
    color: theme.colors.primary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'left',
    marginBottom: 18,
    color: theme.colors.onSurface,
  },
  tabButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: theme.shape.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    color: '#77727F',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  formBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E9E5EF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: theme.typography.titleLarge.fontSize,
    fontWeight: '800',
    marginBottom: 18,
    color: theme.colors.onSurface,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: '#E5E1EA',
    borderRadius: theme.shape.large,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 14,
    fontSize: theme.typography.bodyLarge.fontSize,
    color: theme.colors.onSurface,
  },
  authHint: {
    marginTop: -8,
    marginBottom: 14,
    color: '#77727F',
    fontSize: 12,
    lineHeight: 17,
  },
  categoryPicker: {
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: theme.spacing.sm,
    backgroundColor: '#f8fbf9',
    borderWidth: 1,
    borderColor: '#E5E1EA',
    borderRadius: theme.shape.large,
  },
  categoryPickerText: {
    fontSize: theme.typography.bodyLarge.fontSize,
    color: theme.colors.onSurface,
  },
  categoryPlaceholder: {
    color: '#7b9187',
  },
  categoryOptions: {
    marginBottom: 14,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: '#E5E1EA',
    borderRadius: theme.shape.large,
  },
  categoryOption: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEAF2',
  },
  categoryOptionSelected: {
    backgroundColor: '#F0EBF8',
  },
  categoryOptionText: {
    fontSize: 15,
    color: '#77727F',
  },
  categoryOptionTextSelected: {
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    minHeight: 48,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: 18,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonLogout: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    minHeight: 48,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#E8E4EC',
  },
  buttonDelete: {
    backgroundColor: '#b45349',
    borderRadius: 10,
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: theme.spacing.sm,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: theme.spacing.sm,
  },
  editAccountButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginBottom: theme.spacing.sm,
    borderRadius: 10,
    backgroundColor: '#F0EBF8',
  },
  editAccountButtonText: {
    color: theme.colors.onSurface,
    fontWeight: '700',
    textAlign: 'center',
  },
  accountEditForm: {
    marginBottom: theme.spacing.sm,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 68,
    paddingHorizontal: 12,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: '#E8E4EC',
  },
  floatingActions: {
    position: 'absolute',
    right: 16,
    bottom: 78,
    alignItems: 'flex-end',
    gap: 10,
  },
  floatingActionsEnd: {
    justifyContent: 'flex-end',
  },
  floatingAddButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: theme.colors.primary,
    elevation: theme.elevation.medium,
  },
  floatingAddButtonText: {
    color: theme.colors.surface,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
    textAlign: 'center',
  },
  scrollTopButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E1EA',
    backgroundColor: theme.colors.surface,
    elevation: theme.elevation.medium,
  },
  scrollTopText: {
    color: theme.colors.onSurface,
    fontSize: 23,
    fontWeight: '700',
    lineHeight: 28,
  },
  bottomNavButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.shape.large,
  },
  bottomNavButtonActive: {
    backgroundColor: '#F0EBF8',
  },
  bottomNavText: {
    color: '#77727F',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomNavTextActive: {
    color: theme.colors.onSurface,
  },
  profileNavButton: {
    flex: 1.3,
  },
  profileNavText: {
    flexShrink: 1,
    textAlign: 'left',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  userText: {
    fontSize: 18,
    color: theme.colors.onSurface,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 20,
  },
  commentThread: {
    marginBottom: 18,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  replyButton: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  replyButtonText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  showRepliesButton: {
    alignSelf: 'flex-start',
    minHeight: 36,
    justifyContent: 'center',
    paddingRight: theme.spacing.sm,
  },
  showRepliesText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  replyComposer: {
    marginLeft: 48,
    marginTop: theme.spacing.sm,
  },
  replyInput: {
    minHeight: 68,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E5E1EA',
    borderRadius: 9,
    backgroundColor: theme.colors.surface,
    color: theme.colors.onSurface,
    fontSize: theme.typography.labelMedium.fontSize,
  },
  replySubmitButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 7,
    borderRadius: 9,
    backgroundColor: theme.colors.primary,
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    marginLeft: 48,
  },
  replyAvatar: {
    width: 30,
    height: 30,
    flexShrink: 0,
    marginRight: 9,
    borderRadius: 15,
    backgroundColor: '#F0EBF8',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.sm,
  },
  cardText: {
    fontSize: theme.typography.labelMedium.fontSize,
    color: '#77727F',
    lineHeight: 21,
  },
  listDescription: {
    marginTop: -8,
    marginBottom: theme.spacing.md,
    color: '#77727F',
    fontSize: theme.typography.labelMedium.fontSize,
    lineHeight: 21,
  },
  itemImage: {
    width: '100%',
    height: 180,
    borderRadius: theme.shape.large,
    marginBottom: 14,
  },

  detailBackButton: {
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  detailBackText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  detailImage: {
    width: '100%',
    height: 290,
    borderRadius: 14,
    backgroundColor: '#F0EBF8',
  },
  detailImagePlaceholder: {
    width: '100%',
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#F0EBF8',
  },
  detailPlaceholderText: {
    color: '#77727F',
    fontSize: theme.typography.labelMedium.fontSize,
  },
  detailInformation: {
    paddingTop: 20,
    paddingBottom: 24,
  },
  detailType: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  detailTitle: {
    marginTop: 5,
    marginBottom: 10,
    color: theme.colors.onSurface,
    fontSize: 26,
    fontWeight: '800',
  },
  detailDescription: {
    color: '#77727F',
    fontSize: theme.typography.bodyLarge.fontSize,
    lineHeight: 24,
  },
  detailDivider: {
    height: 1,
    marginVertical: 18,
    backgroundColor: '#E8E4EC',
  },
  detailLabel: {
    marginTop: 10,
    color: '#77727F',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailValue: {
    marginTop: 3,
    color: theme.colors.onSurface,
    fontSize: theme.typography.bodyLarge.fontSize,
  },
  recoveredTag: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
    marginBottom: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#dcefe4',
    color: '#205c3b',
    fontSize: 11,
    fontWeight: '800',
  },
  foundButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
  },
  recoveredButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: '#205c3b',
  },
  recoveryForm: {
    marginBottom: theme.spacing.md,
  },
  recoveredPersonDetails: {
    marginTop: 12,
  },
  recoveredPersonMeta: {
    marginTop: theme.spacing.xs,
    color: '#77727F',
    fontSize: 15,
  },
  cancelRecoveryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F0EBF8',
  },
  recoveredByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  recoveredByAvatar: {
    width: 42,
    height: 42,
    marginRight: 10,
    borderRadius: 21,
    backgroundColor: '#F0EBF8',
  },
  recoveredByInfo: {
    flexShrink: 1,
  },
  recoveredByEmail: {
    marginTop: 2,
    color: '#77727F',
    fontSize: 13,
  },
  commentsSection: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E8E4EC',
  },
  commentsTitle: {
    marginBottom: theme.spacing.md,
    color: theme.colors.onSurface,
    fontSize: 21,
    fontWeight: '800',
  },
  emptyComments: {
    marginBottom: theme.spacing.md,
    color: '#77727F',
    fontSize: theme.typography.labelMedium.fontSize,
    lineHeight: 21,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  commentAvatar: {
    width: 48,
    height: 48,
    marginRight: 11,
    borderRadius: 24,
    backgroundColor: '#F0EBF8',
  },
  commentContent: {
    flex: 1,
    minWidth: 0,
  },
  commentAuthor: {
    marginBottom: 3,
    color: theme.colors.onSurface,
    fontSize: theme.typography.labelMedium.fontSize,
    fontWeight: '700',
  },
  commentText: {
    color: '#77727F',
    fontSize: theme.typography.labelMedium.fontSize,
    lineHeight: 21,
  },
  commentInput: {
    textAlignVertical: 'top',
    minHeight: 88,
    maxHeight: 160,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E1EA',
    borderRadius: theme.shape.large,
    backgroundColor: theme.colors.surface,
    color: theme.colors.onSurface,
    fontSize: 15,
  },
  commentSubmitButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: theme.spacing.sm,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
  },
  itemPreview: {
    width: 112,
    height: 112,
    borderRadius: 14,
    marginTop: theme.spacing.xs,
    marginBottom: 14,
    alignSelf: 'center',
  },
  message: {
    marginTop: 16,
    fontSize: theme.typography.labelMedium.fontSize,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorText: {
    color: theme.colors.error,
  },
  successText: {
    color: '#26734D',
  },
  confirmBox: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E9E5EF',
    marginTop: 12,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.sm,
  },
  confirmText: {
    color: '#77727F',
    marginBottom: 18,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F0EBF8',
    borderRadius: theme.shape.large,
    minHeight: 46,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  cancelButtonText: {
    color: '#4A2B88',
    fontWeight: '700',
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: theme.colors.error,
    borderRadius: theme.shape.large,
    minHeight: 46,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  addMenuContainer: {
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  addMenu: {
    minWidth: 176,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E8E4EC',
    borderRadius: theme.shape.medium,
    backgroundColor: theme.colors.surface,
    elevation: theme.elevation.medium,
  },
  addMenuOption: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  addMenuOptionText: {
    color: theme.colors.onSurface,
    fontSize: theme.typography.labelMedium.fontSize,
    fontWeight: '600',
  },
  eyebrow: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 1,
  },
  searchBox: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.background,
    borderRadius: 15,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  categoryFilterButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderRadius: 9,
  },
  categoryFilterButtonActive: {
    backgroundColor: '#ECE9F0',
  },
  dateFilterPanel: {
    marginBottom: 14,
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: '#E7E2EC',
    borderRadius: theme.shape.large,
  },
  dateFilterHeader: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  dateFilterTitle: {
    color: theme.colors.onSurface,
    fontSize: theme.typography.labelMedium.fontSize,
    fontWeight: '700',
  },
  dateFilterClear: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  dateFilterInput: {
    minHeight: 50,
    marginBottom: 10,
  },
  filterDatePickerPanel: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
  },
  filterDatePickerDone: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    borderRadius: theme.shape.medium,
    backgroundColor: theme.colors.primary,
  },
  datePickerPanel: {
    marginBottom: 14,
    padding: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
  },
  datePickerActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  datePickerCancel: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.shape.medium,
    backgroundColor: '#ECE9F0',
  },
  datePickerCancelText: {
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  datePickerConfirm: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.shape.medium,
    backgroundColor: theme.colors.primary,
  },
  datePickerDoneText: {
    color: theme.colors.surface,
    fontWeight: '700',
  },
  categoryFilterIcon: {
    alignItems: 'center',
    gap: 3,
  },
  categoryFilterMark: {
    height: 2,
    borderRadius: 1,
    backgroundColor: '#77727F',
  },
  categoryFilterMarkWide: {
    width: 16,
  },
  categoryFilterMarkMiddle: {
    width: 11,
  },
  categoryFilterMarkNarrow: {
    width: 6,
  },
  categoryFilterMarkActive: {
    backgroundColor: theme.colors.primary,
  },
  searchMark: {
    color: '#77727F',
    fontSize: 25,
    marginRight: 9,
  },
  searchInput: {
    textAlignVertical: 'center',
    flex: 1,
    minHeight: 50,
    color: theme.colors.onSurface,
    fontSize: 15,
  },
  clearSearch: {
    color: '#77727F',
    fontSize: theme.typography.headlineMedium.fontSize,
    paddingHorizontal: 4,
  },
  categoryRow: {
    height: 48,
    flexGrow: 0,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  categoryFilterScroll: {
    height: 58,
    flexGrow: 0,
    flexShrink: 0,
  },
  categoryChip: {
    height: 36,
    minHeight: 36,
    flexShrink: 0,
    paddingHorizontal: 15,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECE9F0',
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
  },
  categoryChipText: {
    color: '#68636F',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: theme.colors.surface,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  sectionHeadingTitle: {
    color: theme.colors.onSurface,
    fontSize: 17,
    fontWeight: '700',
  },
  resultCount: {
    color: '#89848F',
    fontSize: 12,
  },
  itemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  itemCard: {
    width: '48.5%',
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: '#E8E4EC',
    borderRadius: theme.shape.medium,
    marginBottom: 12,
  },
  itemImagePlaceholder: {
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E3E8',
  },
  placeholderMark: {
    color: '#77727F',
    fontSize: 36,
  },
  itemCardContent: {
    padding: 6,
  },
  itemCreatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEEAF2',
  },
  itemCreatorAvatar: {
    width: 28,
    height: 28,
    marginRight: 7,
    borderRadius: 14,
    backgroundColor: '#F0EBF8',
  },
  itemCreatorText: {
    flex: 1,
    minWidth: 0,
  },
  itemCreatorName: {
    color: '#28242F',
    fontSize: 11,
    fontWeight: '700',
  },
  itemCreatorEmail: {
    marginTop: 2,
    color: '#77727F',
    fontSize: 9,
  },
  creatorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEAF2',
  },
  creatorAvatar: {
    width: 48,
    height: 48,
    marginRight: 12,
    borderRadius: 24,
    backgroundColor: '#F0EBF8',
  },
  creatorText: {
    flex: 1,
    minWidth: 0,
  },
  creatorLabel: {
    marginTop: 10,
    color: '#77727F',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  creatorName: {
    marginTop: 3,
    color: '#28242F',
    fontSize: 15,
    fontWeight: '700',
  },
  creatorEmail: {
    marginTop: 2,
    color: '#77727F',
    fontSize: 13,
  },
  itemTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: theme.spacing.sm,
  },
  itemTypeBadgeLost: {
    backgroundColor: '#FFF0ED',
  },
  itemTypeBadgeFound: {
    backgroundColor: '#EAF5EF',
  },
  itemTypeBadgeRecovered: {
    backgroundColor: '#E7F0F8',
  },
  oldItemBadge: {
    backgroundColor: '#FFD6D6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.shape.medium,
    alignSelf: 'flex-start',
    marginTop: theme.spacing.xs,
  },
  oldItemBadgeText: {
    color: '#A11A1A',
    fontSize: 10,
    fontWeight: '700',
  },
  itemTypeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  itemTypeBadgeTextLost: {
    color: '#B84D36',
  },
  itemTypeBadgeTextFound: {
    color: '#26734D',
  },
  itemTypeBadgeTextRecovered: {
    color: '#315B83',
  },
  itemCategoryBadge: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    marginBottom: theme.spacing.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#ECE9F0',
  },
  itemCategoryBadgeText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  itemLocation: {
    color: theme.colors.primary,
    fontSize: 11,
    marginTop: 7,
  },
  itemDate: {
    color: '#68636F',
    fontSize: 11,
    marginTop: theme.spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.large,
    padding: 28,
    marginTop: theme.spacing.xs,
    borderWidth: 1,
    borderColor: '#E9E5EF',
  },
  emptyStateMark: {
    color: '#77727F',
    fontSize: 38,
    marginBottom: theme.spacing.sm,
  },
  profileScreen: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    alignItems: 'center',
  },
  profileHero: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 28,
  },
  profilePageTitle: {
    width: '100%',
    marginBottom: 0,
    textAlign: 'center',
  },
  profileIdentity: {
    width: '100%',
    alignItems: 'center',
  },
  profileTypeTitle: {
    marginBottom: theme.spacing.md,
    color: theme.colors.onSurface,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  profileEmail: {
    color: '#77727F',
    fontSize: theme.typography.labelMedium.fontSize,
    marginTop: 0,
    marginBottom: 10,
    textAlign: 'center',
  },
  myItemsFilterRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: 10,
    marginBottom: 14,
  },
  myItemsFilter: {
    minHeight: 38,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECE9F0',
    borderRadius: theme.shape.large,
  },
  myItemsFilterActive: {
    backgroundColor: theme.colors.primary,
  },
  myItemsFilterText: {
    color: '#68636F',
    fontSize: 12,
    fontWeight: '700',
  },
  myItemsFilterTextActive: {
    color: theme.colors.surface,
  },
  profileAction: {
    width: '100%',
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: '#E8E4EC',
    borderRadius: 14,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  profileActionTitle: {
    color: '#27232E',
    fontSize: 17,
    fontWeight: '700',
  },
  profileActionSubtitle: {
    color: '#77727F',
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
  actionArrow: {
    color: theme.colors.primary,
    fontSize: 28,
  },
  settingsSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E4EC',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  settingsLabel: {
    color: '#89848F',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 14,
  },
  settingsOption: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  settingsEditLabel: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  profileEditForm: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E4EC',
    padding: 16,
    marginTop: 14,
  },
  cancelEditText: {
    color: '#77727F',
    fontSize: theme.typography.labelMedium.fontSize,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 10,
  },
  settingsRowTitle: {
    color: '#77727F',
    fontSize: 12,
  },
  settingsRowValue: {
    color: '#28242F',
    fontSize: 15,
    fontWeight: '600',
  },
  settingsDivider: {
    height: 1,
    backgroundColor: '#EEEAF2',
    marginVertical: 8,
  },
  buttonLogoutText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDeleteText: {
    color: theme.colors.error,
    fontSize: 15,
    fontWeight: '700',
  },
  itemPreviewWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  removeImageButton: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: theme.shape.large,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0ED',
  },
  removeImageText: {
    color: theme.colors.error,
    fontSize: 13,
    fontWeight: '700',
  },
});
