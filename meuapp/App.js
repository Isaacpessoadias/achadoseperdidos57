/* eslint-disable */
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
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
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
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
const ACCOUNT_DOMAIN_HINT = 'Use e-mail @ifpe.edu.br (servidor) ou @discente.ifpe.edu.br (aluno).';

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

const getAccountType = (emailAddress) => {
  const normalizedEmail = (emailAddress || '').trim().toLowerCase();

  if (/^[^@\s]+@discente\.ifpe\.edu\.br$/.test(normalizedEmail)) {
    return 'student';
  }

  if (/^[^@\s]+@ifpe\.edu\.br$/.test(normalizedEmail)) {
    return 'server';
  }

  return null;
};

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

function CommentItem({ comment, itemId, user, profileName, profileImage }) {
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
      setReplyError(getFirestoreError(error, 'enviar a resposta'));
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
}

export default function App() {
  const [screen, setScreen] = useState('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ type: '', text: '' });
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('lost');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [showCategoryFilters, setShowCategoryFilters] = useState(false);
  const [myItemFilter, setMyItemFilter] = useState('all');
  const [profileImage, setProfileImage] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [editingProfileField, setEditingProfileField] = useState('');
  const [profileNameDraft, setProfileNameDraft] = useState('');
  const [profileEmailDraft, setProfileEmailDraft] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [profileSection, setProfileSection] = useState('account');
  const [commentedItems, setCommentedItems] = useState([]);
  const [isLoadingCommentedItems, setIsLoadingCommentedItems] = useState(false);
  const [commentedItemsError, setCommentedItemsError] = useState('');
  const [editProfileName, setEditProfileName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [foundItems, setFoundItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemComments, setItemComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemLocation, setItemLocation] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);
  const [itemImage, setItemImage] = useState(null);
  const [itemImageFile, setItemImageFile] = useState(null);
  const [itemType, setItemType] = useState('found');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const scrollViewRef = useRef(null);
  const isItemListView = activeView === 'lost' || activeView === 'found';
  const activeNavigationView = ['profile', 'settings', 'myItems'].includes(activeView)
    ? 'profile'
    : activeView === 'addItem'
      ? itemType
      : activeView === 'itemDetail'
        ? selectedItem?.type || 'found'
        : activeView;

  useEffect(() => {
    if (activeView !== 'itemDetail' || !selectedItem?.id) {
      return undefined;
    }

    setIsLoadingComments(true);
    setCommentsError('');
    const unsubscribe = onSnapshot(
      collection(db, 'items', selectedItem.id, 'comments'),
      (snapshot) => {
        const comments = snapshot.docs
          .map((commentSnapshot) => ({ id: commentSnapshot.id, ...commentSnapshot.data() }))
          .sort((first, second) => {
            const firstDate = first.createdAt?.toMillis?.() || 0;
            const secondDate = second.createdAt?.toMillis?.() || 0;
            return firstDate - secondDate;
          });

        setItemComments(comments);
        setIsLoadingComments(false);
      },
      (error) => {
        setCommentsError(getFirestoreError(error, 'carregar os comentários'));
        setIsLoadingComments(false);
      },
    );

    return unsubscribe;
  }, [activeView, selectedItem]);

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
        setActiveView('lost');
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    setShowScrollTop(false);
    setShowAddMenu(false);
    setShowCategoryFilters(false);
  }, [activeView]);

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
      try {
        const profileSnapshot = await getDoc(doc(db, 'profiles', user.uid));
        const profile = profileSnapshot.exists() ? profileSnapshot.data() : null;

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
          .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }))
          .sort((first, second) => {
            const firstDate = new Date(first.createdAt || first.foundAt || 0).getTime();
            const secondDate = new Date(second.createdAt || second.foundAt || 0).getTime();
            return secondDate - firstDate;
          });

        setFoundItems(items);
      } catch (error) {
        setFoundItems([]);
        setStatus({ type: 'error', text: getFirestoreError(error, 'carregar os itens achados') });
      }
    };

    loadUserData();
  }, [user]);

  useEffect(() => {
    if (activeView !== 'profile' || profileSection !== 'commented' || !user) {
      return;
    }

    let isActive = true;
    const loadCommentedItems = async () => {
      setIsLoadingCommentedItems(true);
      setCommentedItemsError('');
      try {
        const itemIds = new Set();
        for (let index = 0; index < foundItems.length; index += 10) {
          if (!isActive) {
            return;
          }

          const itemBatch = foundItems.slice(index, index + 10);
          const commentSnapshots = await Promise.all(itemBatch.map((item) => getDocs(
            query(
              collection(db, 'items', item.id, 'comments'),
              where('userId', '==', user.uid),
            ),
          )));

          commentSnapshots.forEach((commentsSnapshot, batchIndex) => {
            if (!commentsSnapshot.empty) {
              itemIds.add(itemBatch[batchIndex].id);
            }
          });
        }

        if (isActive) {
          setCommentedItems(foundItems.filter((item) => itemIds.has(item.id)));
        }
      } catch (error) {
        if (isActive) {
          setCommentedItemsError(getFirestoreError(error, 'carregar os itens comentados'));
          setCommentedItems([]);
        }
      } finally {
        if (isActive) {
          setIsLoadingCommentedItems(false);
        }
      }
    };

    loadCommentedItems();
    return () => {
      isActive = false;
    };
  }, [activeView, profileSection, user, foundItems]);

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
  const openProfile = () => {
    setActiveView('profile');
  };

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
      setActiveView('lost');
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
      setActiveView('lost');
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
      setActiveView('lost');
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

  const handleAddItem = async () => {
    if (!itemName.trim() || !itemDescription.trim() || !itemLocation.trim() || !itemCategory.trim()) {
      setStatus({ type: 'error', text: 'Preencha todos os campos.' });
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
        imageUrl: safeImageUrl,
        createdAt: new Date().toISOString(),
        foundAt: new Date().toISOString(),
        userId: user ? user.uid : null,
      };

      uploadStage = 'item';
      const itemReference = await addDoc(collection(db, 'items'), itemData);
      setFoundItems((currentItems) => [{ id: itemReference.id, ...itemData }, ...currentItems]);

      setStatus({ type: 'success', text: 'Item cadastrado com sucesso.' });
      setItemName('');
      setItemDescription('');
      setItemLocation('');
      setItemCategory('');
      setShowCategoryOptions(false);
      setItemImage(null);
      setItemImageFile(null);
      setActiveView(itemType === 'lost' ? 'lost' : 'found');
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
      setActiveView('lost');
      setStatus({ type: 'success', text: 'Sua conta foi excluída com sucesso.' });
      clearForm();
      setScreen('login');
      setConfirmDelete(false);
    } catch (error) {
      const code = error?.code || '';

      if (code === 'auth/requires-recent-login') {
        setStatus({ type: 'error', text: 'Para excluir a conta, faça login novamente e tente outra vez.' });
        setConfirmDelete(false);
        return;
      }

      setStatus({ type: 'error', text: getFriendlyAuthError(error, 'excluir a conta') });
      setConfirmDelete(false);
    }
  };

  const handleUpdateAccount = async () => {
    const normalizedName = editProfileName.trim();
    const passwordChanged = newPassword.length > 0;

    if (!normalizedName) {
      setStatus({ type: 'error', text: 'Informe seu nome.' });
      return;
    }

    if (passwordChanged && newPassword.length < 6) {
      setStatus({ type: 'error', text: 'A nova senha precisa ter pelo menos 6 caracteres.' });
      return;
    }

    if (passwordChanged && !currentPassword) {
      setStatus({ type: 'error', text: 'Informe sua senha atual para alterá-la.' });
      return;
    }

    if (!auth.currentUser) {
      setStatus({ type: 'error', text: 'Nenhuma conta ativa para atualizar.' });
      return;
    }

    setIsSavingAccount(true);
    try {
      const currentUser = auth.currentUser;

      if (passwordChanged) {
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, newPassword);
      }

      await setDoc(
        doc(db, 'profiles', currentUser.uid),
        { name: normalizedName, email: currentUser.email || '' },
        { merge: true },
      );
      await updateProfile(currentUser, { displayName: normalizedName });

      setProfileName(normalizedName);
      setEditProfileName(normalizedName);
      setCurrentPassword('');
      setNewPassword('');
      setIsEditingAccount(false);
      setStatus({ type: 'success', text: 'Informações da conta atualizadas com sucesso.' });
    } catch (error) {
      const message = error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential'
        ? 'A senha atual está incorreta.'
        : error?.code?.startsWith('auth/')
          ? getFriendlyAuthError(error, 'atualizar as informações da conta')
          : getFirestoreError(error, 'atualizar o perfil');
      setStatus({ type: 'error', text: message });
    } finally {
      setIsSavingAccount(false);
    }
  };

  const renderItemList = (type, ownItemsOnly = false) => {
    const filteredItems = foundItems.filter((item) => {
      const matchesType = type === 'all' || (item.type || 'found') === type;
      const matchesOwner = !ownItemsOnly || item.userId === user?.uid;
      const matchesCategory = selectedCategory === 'Todas'
        || normalizeItemCategory(item.category) === selectedCategory;
      const searchableText = `${item.name || ''} ${item.description || ''} ${item.location || ''} ${item.category || ''}`.toLocaleLowerCase();
      return matchesType && matchesOwner && matchesCategory
        && searchableText.includes(searchQuery.trim().toLocaleLowerCase());
    });

    if (!filteredItems.length) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateMark}>◎</Text>
          <Text style={styles.cardTitle}>
            {searchQuery || selectedCategory !== 'Todas'
              ? 'Nenhum resultado encontrado'
              : ownItemsOnly
                ? 'Você ainda não publicou nenhum item'
                : type === 'lost' ? 'Nenhum item perdido por aqui' : 'Nenhum item achado por aqui'}
          </Text>
          <Text style={styles.cardText}>Tente ajustar a busca ou confira novamente mais tarde.</Text>
        </View>
      );
    }

    return (
      <View style={styles.itemGrid}>
        {filteredItems.map((item) => {
          const itemIsLost = (item.type || 'found') === 'lost';
          return (
            <TouchableOpacity
              style={styles.itemCard}
              key={item.id}
              onPress={() => {
                setSelectedItem(item);
                setItemComments([]);
                setCommentText('');
                setActiveView('itemDetail');
              }}
              accessibilityRole="button"
              accessibilityLabel={`Ver detalhes de ${item.name}, categoria ${normalizeItemCategory(item.category)}`}
            >
              {item.imageUrl
                ? <Image source={{ uri: item.imageUrl }} style={styles.itemImage} resizeMode="cover" />
                : <View style={styles.itemImagePlaceholder}><Text style={styles.placeholderMark}>◎</Text></View>}
              <View style={styles.itemCardContent}>
                <View style={[styles.itemTypeBadge, itemIsLost ? styles.itemTypeBadgeLost : styles.itemTypeBadgeFound]}>
                  <Text style={[styles.itemTypeBadgeText, itemIsLost ? styles.itemTypeBadgeTextLost : styles.itemTypeBadgeTextFound]}>
                    {itemIsLost ? 'Perdido' : 'Achado'}
                  </Text>
                </View>
                <View style={styles.itemCategoryBadge}>
                  <Text style={styles.itemCategoryBadgeText} numberOfLines={1}>
                    {getCategoryOption(item.category).symbol} {normalizeItemCategory(item.category)}
                  </Text>
                </View>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardText} numberOfLines={2}>{item.description}</Text>
                <Text style={styles.itemLocation} numberOfLines={1}>{item.location}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
    return filteredItems.map((item) => (
      <TouchableOpacity
        style={styles.card}
        key={item.id}
        onPress={() => {
          setSelectedItem(item);
          setItemComments([]);
          setCommentText('');
          setActiveView('itemDetail');
        }}
        accessibilityRole="button"
        accessibilityLabel={`Ver detalhes de ${item.name}`}
        activeOpacity={0.85}
      >
        {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.itemImage} /> : null}
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardText}>{item.description}</Text>
        <Text style={styles.cardText}>Local: {item.location}</Text>
        <Text style={styles.cardText}>Categoria: {item.category}</Text>
        <Text style={styles.cardText}>Tipo: {type === 'lost' ? 'Item perdido' : 'Item achado'}</Text>
      </TouchableOpacity>
    ));
  };

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
                contentContainerStyle={[styles.container, (isItemListView || activeView === 'itemDetail') && styles.containerWithFloatingActions]}
                keyboardShouldPersistTaps="handled"
                onScroll={(event) => setShowScrollTop(event.nativeEvent.contentOffset.y > 220)}
                scrollEventThrottle={16}
              >
            {(activeView === 'lost' || activeView === 'found') && (
              <>
                <Text style={styles.eyebrow}>ACHADOS & PERDIDOS</Text>
                <Text style={styles.title}>{activeView === 'lost' ? 'Itens perdidos' : 'Itens achados'}</Text>
                <View style={styles.searchBox}>
                  <Text style={styles.searchMark}>⌕</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por nome, local..."
                    placeholderTextColor="#8B8992"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                  />
                  {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><Text style={styles.clearSearch}>×</Text></TouchableOpacity> : null}
                  <TouchableOpacity
                    style={[styles.categoryFilterButton, (showCategoryFilters || selectedCategory !== 'Todas') && styles.categoryFilterButtonActive]}
                    onPress={() => setShowCategoryFilters((showing) => !showing)}
                    accessibilityRole="button"
                    accessibilityLabel="Filtrar por categoria"
                    accessibilityState={{ expanded: showCategoryFilters, selected: selectedCategory !== 'Todas' }}
                  >
                    <View style={styles.categoryFilterIcon}>
                      <View style={[styles.categoryFilterMark, styles.categoryFilterMarkWide, (showCategoryFilters || selectedCategory !== 'Todas') && styles.categoryFilterMarkActive]} />
                      <View style={[styles.categoryFilterMark, styles.categoryFilterMarkMiddle, (showCategoryFilters || selectedCategory !== 'Todas') && styles.categoryFilterMarkActive]} />
                      <View style={[styles.categoryFilterMark, styles.categoryFilterMarkNarrow, (showCategoryFilters || selectedCategory !== 'Todas') && styles.categoryFilterMarkActive]} />
                    </View>
                  </TouchableOpacity>
                </View>
                {showCategoryFilters && (
                  <ScrollView
                    horizontal
                    style={[
                      styles.categoryFilterScroll,
                      Platform.OS === 'web' && {
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#6336C8 #E8E4EC',
                      },
                    ]}
                    showsHorizontalScrollIndicator
                    contentContainerStyle={styles.categoryRow}
                  >
                    {['Todas', ...ITEM_CATEGORIES.map((option) => option.label)].map((category) => {
                      const categoryOption = ITEM_CATEGORIES.find((option) => option.label === category);
                      return (
                        <TouchableOpacity
                          key={category}
                          style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]}
                          onPress={() => setSelectedCategory(category)}
                        >
                          <Text style={[styles.categoryChipText, selectedCategory === category && styles.categoryChipTextActive]}>
                            {categoryOption ? `${categoryOption.symbol} ` : ''}{category}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </>
            )}

            {activeView === 'lost' && (
              <View>
                <Text style={styles.title}>Itens Perdidos</Text>
                {renderItemList('lost')}
              </View>
            )}

            {activeView === 'found' && (
              <View>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionHeadingTitle}>Achados recentemente</Text>
                  <Text style={styles.resultCount}>{foundItems.filter((item) => (item.type || 'found') === 'found').length} itens</Text>
                </View>
                <Text style={styles.title}>Itens Achados</Text>
                {renderItemList('found')}
              </View>
            )}

            {activeView === 'itemDetail' && selectedItem && (
              <View>
                <TouchableOpacity
                  style={styles.detailBackButton}
                  onPress={() => setActiveView(selectedItem.type === 'lost' ? 'lost' : 'found')}
                  accessibilityRole="button"
                  accessibilityLabel="Voltar para a lista de itens"
                >
                  <Text style={styles.detailBackText}>‹  Voltar aos itens</Text>
                </TouchableOpacity>
                {selectedItem.imageUrl ? (
                  <Image source={{ uri: selectedItem.imageUrl }} style={styles.detailImage} resizeMode="cover" />
                ) : (
                  <View style={styles.detailImagePlaceholder}>
                    <Text style={styles.detailPlaceholderText}>Imagem não disponível</Text>
                  </View>
                )}
                <View style={styles.detailInformation}>
                  <Text style={styles.detailType}>{selectedItem.type === 'lost' ? 'ITEM PERDIDO' : 'ITEM ACHADO'}</Text>
                  <Text style={styles.detailTitle}>{selectedItem.name}</Text>
                  <Text style={styles.detailDescription}>{selectedItem.description}</Text>
                  <View style={styles.detailDivider} />
                  <Text style={styles.detailLabel}>Local</Text>
                  <Text style={styles.detailValue}>{selectedItem.location}</Text>
                  <Text style={styles.detailLabel}>Categoria</Text>
                  <Text style={styles.detailValue}>
                    {getCategoryOption(selectedItem.category).symbol} {normalizeItemCategory(selectedItem.category)}
                  </Text>
                </View>
                <View style={styles.commentsSection}>
                  <Text style={styles.commentsTitle}>Comentários ({itemComments.length})</Text>
                  {commentsError ? <Text style={styles.errorText}>{commentsError}</Text> : null}
                  {isLoadingComments ? <ActivityIndicator color="#0f766e" /> : null}
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Escreva um comentário..."
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                    maxLength={1000}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={[styles.commentSubmitButton, (!commentText.trim() || isSubmittingComment) && styles.buttonDisabled]}
                    onPress={handleAddComment}
                    disabled={!commentText.trim() || isSubmittingComment}
                    accessibilityRole="button"
                  >
                    {isSubmittingComment ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Comentar</Text>}
                  </TouchableOpacity>
                  {!isLoadingComments && !itemComments.length && !commentsError ? (
                    <Text style={styles.emptyComments}>Ainda não há comentários. Comece a conversa.</Text>
                  ) : null}
                  {itemComments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      itemId={selectedItem.id}
                      user={user}
                      profileName={profileName}
                      profileImage={profileImage}
                    />
                  ))}
                </View>
              </View>
            )}

            {activeView === 'profile' && (
              <View style={styles.profileScreen}>
                <Text style={[styles.title, styles.profilePageTitle]}>Meu perfil</Text>
                <View style={styles.profileHero}>
              <View style={styles.profileIdentity}>
                <Text style={styles.profileTypeTitle}>
                  {getAccountType(user.email) === 'server' ? 'Perfil do Servidor' : 'Perfil do Aluno'}
                </Text>
                <View style={styles.profileImageContainer}>
                  <TouchableOpacity style={styles.profileImageButton} onPress={handlePickProfileImage} disabled={isUploading}>
                    <Image source={profileImage ? { uri: profileImage } : DEFAULT_PROFILE_IMAGE} style={styles.profileImageHome} resizeMode="cover" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.userText}>{profileName || user.displayName || 'Minha conta'}</Text>
                <Text style={styles.profileEmail}>{user.email}</Text>
                <TouchableOpacity onPress={handlePickProfileImage} disabled={isUploading}>
                  <Text style={styles.changeImageText}>Alterar foto do perfil</Text>
                </TouchableOpacity>
                </View>
                </View>
                <TouchableOpacity style={styles.profileAction} onPress={() => { setSelectedCategory('Todas'); setSearchQuery(''); setActiveView('myItems'); }}>
                  <View><Text style={styles.profileActionTitle}>Meus itens</Text><Text style={styles.profileActionSubtitle}>Acompanhe o que você publicou</Text></View>
                  <Text style={styles.actionArrow}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.profileAction} onPress={() => setActiveView('settings')}>
                  <View><Text style={styles.profileActionTitle}>Configurações</Text><Text style={styles.profileActionSubtitle}>Conta e segurança</Text></View>
                  <Text style={styles.actionArrow}>›</Text>
                </TouchableOpacity>
                {status.text ? (
                  <Text style={[styles.message, status.type === 'error' ? styles.errorText : styles.successText]}>{status.text}</Text>
                ) : null}
              </View>
            )}

            {activeView === 'myItems' && (
              <View>
                <TouchableOpacity onPress={() => setActiveView('profile')} style={styles.backButton}>
                  <Text style={styles.backButtonText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Meus itens</Text>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionHeadingTitle}>Suas publicações</Text>
                  <Text style={styles.resultCount}>{foundItems.filter((item) => item.userId === user.uid).length} itens</Text>
                </View>
                <View style={styles.myItemsFilterRow}>
                  {[
                    { key: 'all', label: 'Todos' },
                    { key: 'lost', label: 'Perdidos' },
                    { key: 'found', label: 'Achados' },
                  ].map((filter) => (
                    <TouchableOpacity
                      key={filter.key}
                      style={[styles.myItemsFilter, myItemFilter === filter.key && styles.myItemsFilterActive]}
                      onPress={() => setMyItemFilter(filter.key)}
                    >
                      <Text style={[styles.myItemsFilterText, myItemFilter === filter.key && styles.myItemsFilterTextActive]}>{filter.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {renderItemList(myItemFilter, true)}
              </View>
            )}

            {activeView === 'settings' && (
              <View>
                <TouchableOpacity onPress={() => setActiveView('profile')} style={styles.backButton}>
                  <Text style={styles.backButtonText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Configurações</Text>
                <View style={styles.settingsSection}>
                  <Text style={styles.settingsLabel}>CONTA</Text>
                  <TouchableOpacity style={styles.settingsOption} onPress={() => startEditingProfileField('name')}>
                    <View><Text style={styles.settingsRowTitle}>Nome</Text><Text style={styles.settingsRowValue}>{profileName || user.displayName || 'Não informado'}</Text></View>
                    <Text style={styles.settingsEditLabel}>Trocar</Text>
                  </TouchableOpacity>
                  <View style={styles.settingsDivider} />
                  <TouchableOpacity style={styles.settingsOption} onPress={() => startEditingProfileField('email')}>
                    <View><Text style={styles.settingsRowTitle}>E-mail</Text><Text style={styles.settingsRowValue}>{user.email}</Text></View>
                    <Text style={styles.settingsEditLabel}>Trocar</Text>
                  </TouchableOpacity>
                  <View style={styles.settingsDivider} />
                  <TouchableOpacity style={styles.settingsOption} onPress={() => startEditingProfileField('password')}>
                    <View><Text style={styles.settingsRowTitle}>Senha</Text><Text style={styles.settingsRowValue}>Atualizar senha de acesso</Text></View>
                    <Text style={styles.settingsEditLabel}>Trocar</Text>
                  </TouchableOpacity>
                </View>
                {editingProfileField ? (
                  <View style={styles.profileEditForm}>
                    <Text style={styles.sectionTitle}>
                      {editingProfileField === 'name' ? 'Alterar nome' : editingProfileField === 'email' ? 'Alterar e-mail' : 'Alterar senha'}
                    </Text>
                    {editingProfileField === 'name' ? (
                      <TextInput style={styles.input} placeholder="Seu nome" value={profileNameDraft} onChangeText={setProfileNameDraft} autoCapitalize="words" />
                    ) : (
                      <>
                        {editingProfileField === 'email' ? (
                          <TextInput style={styles.input} placeholder="Novo e-mail" value={profileEmailDraft} onChangeText={setProfileEmailDraft} keyboardType="email-address" autoCapitalize="none" />
                        ) : (
                          <TextInput style={styles.input} placeholder="Nova senha (mínimo 6 caracteres)" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
                        )}
                        <TextInput style={styles.input} placeholder="Senha atual" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
                      </>
                    )}
                    <TouchableOpacity style={[styles.buttonPrimary, isSavingProfile && styles.buttonDisabled]} onPress={handleSaveProfileField} disabled={isSavingProfile}>
                      {isSavingProfile ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Salvar alteração</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditingProfileField('')}>
                      <Text style={styles.cancelEditText}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                <TouchableOpacity style={styles.buttonLogout} onPress={handleLogout}>
                  <Text style={styles.buttonLogoutText}>Sair da conta</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.buttonDelete} onPress={() => setConfirmDelete(true)}>
                  <Text style={styles.buttonDeleteText}>Excluir conta</Text>
                </TouchableOpacity>
                {status.text ? (
                  <Text style={[styles.message, status.type === 'error' ? styles.errorText : styles.successText]}>{status.text}</Text>
                ) : null}
                {confirmDelete && (
                  <View style={styles.confirmBox}>
                    <Text style={styles.confirmTitle}>Confirmar exclusão</Text>
                    <Text style={styles.confirmText}>Essa ação apagará sua conta permanentemente. Deseja continuar?</Text>
                    <View style={styles.confirmActions}>
                      <TouchableOpacity style={styles.cancelButton} onPress={() => setConfirmDelete(false)}>
                        <Text style={styles.cancelButtonText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.confirmDeleteButton} onPress={handleDeleteAccount}>
                        <Text style={styles.buttonText}>Excluir</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            {activeView === 'addItem' && (
              <View>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => setActiveView(itemType === 'lost' ? 'lost' : 'found')}
                    accessibilityRole="button"
                    accessibilityLabel="Voltar para os itens"
                  >
                    <Text style={styles.backButtonText}>‹</Text>
                  </TouchableOpacity>
                  <Text style={styles.title}>{itemType === 'lost' ? 'Cadastrar Item Perdido' : 'Cadastrar Item Achado'}</Text>
                  <TextInput style={styles.input} placeholder="Nome" value={itemName} onChangeText={setItemName} />
                  <TextInput style={styles.input} placeholder="Descrição" value={itemDescription} onChangeText={setItemDescription} />
                  <TextInput style={styles.input} placeholder="Localização" value={itemLocation} onChangeText={setItemLocation} />
                  <TouchableOpacity
                    style={styles.categoryPicker}
                    onPress={() => setShowCategoryOptions((showing) => !showing)}
                    accessibilityRole="button"
                    accessibilityLabel={itemCategory || 'Selecionar categoria do item'}
                  >
                    <Text style={[styles.categoryPickerText, !itemCategory && styles.categoryPlaceholder]}>
                      {itemCategory ? `${getCategoryOption(itemCategory).symbol} ${itemCategory}` : 'Selecionar categoria'}
                    </Text>
                  </TouchableOpacity>
                  {showCategoryOptions && (
                    <View style={styles.categoryOptions}>
                      {ITEM_CATEGORIES.map((category) => (
                        <TouchableOpacity
                          key={category.label}
                          style={[styles.categoryOption, itemCategory === category.label && styles.categoryOptionSelected]}
                          onPress={() => {
                            setItemCategory(category.label);
                            setShowCategoryOptions(false);
                          }}
                          accessibilityRole="button"
                          accessibilityState={{ selected: itemCategory === category.label }}
                        >
                          <Text style={[styles.categoryOptionText, itemCategory === category.label && styles.categoryOptionTextSelected]}>
                            {category.symbol} {category.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity style={[styles.buttonPrimary, isUploading && styles.buttonDisabled]} onPress={handlePickItemImage} disabled={isUploading}>
                    <Text style={styles.buttonText}>Selecionar Imagem</Text>
                  </TouchableOpacity>

                  {itemImage ? (
                    <View style={styles.itemPreviewWrap}>
                      <Image source={{ uri: itemImage }} style={styles.itemPreview} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => {
                          setItemImage(null);
                          setItemImageFile(null);
                          setStatus({ type: 'success', text: 'Imagem removida. O item será salvo sem foto.' });
                        }}
                        disabled={isUploading}
                        accessibilityRole="button"
                        accessibilityLabel="Remover imagem selecionada"
                      >
                        <Text style={styles.removeImageText}>Remover imagem</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  <TouchableOpacity style={[styles.buttonPrimary, isUploading && styles.buttonDisabled]} onPress={handleAddItem} disabled={isUploading}>
                    {isUploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Salvar</Text>}
                  </TouchableOpacity>

                  {status.text ? (
                    <Text style={[styles.message, status.type === 'error' ? styles.errorText : styles.successText]}>{status.text}</Text>
                  ) : null}

                  <TouchableOpacity style={styles.tabButton} onPress={() => setActiveView(itemType === 'lost' ? 'lost' : 'found')}>
                    <Text style={styles.tabText}>Cancelar</Text>
                  </TouchableOpacity>
              </View>
            )}

            {confirmDelete && activeView === 'settings' && (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmTitle}>Confirmar exclusão</Text>
                <Text style={styles.confirmText}>Essa ação apagará sua conta permanentemente. Deseja continuar?</Text>
                <View style={styles.confirmActions}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setConfirmDelete(false)}>
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmDeleteButton} onPress={handleDeleteAccount}>
                    <Text style={styles.buttonText}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
              </ScrollView>
              {(isItemListView || showScrollTop) && (
                <View style={[styles.floatingActions, !isItemListView && styles.floatingActionsEnd]}>
                  {isItemListView && (
                    <View style={styles.addMenuContainer}>
                      {showAddMenu && (
                        <View style={styles.addMenu}>
                          <TouchableOpacity
                            style={styles.addMenuOption}
                            onPress={() => {
                              setItemType('found');
                              setActiveView('addItem');
                            }}
                            accessibilityRole="button"
                          >
                            <Text style={styles.addMenuOptionText}>Cadastrar achado</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.addMenuOption}
                            onPress={() => {
                              setItemType('lost');
                              setActiveView('addItem');
                            }}
                            accessibilityRole="button"
                          >
                            <Text style={styles.addMenuOptionText}>Cadastrar perdido</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.floatingAddButton}
                        onPress={() => setShowAddMenu((showing) => !showing)}
                        disabled={isUploading}
                        accessibilityRole="button"
                        accessibilityLabel={showAddMenu ? 'Fechar opções de cadastro' : 'Cadastrar item'}
                        accessibilityState={{ expanded: showAddMenu }}
                      >
                        <Text style={styles.floatingAddButtonText}>{showAddMenu ? '×' : '+'}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {showScrollTop && (
                    <TouchableOpacity
                      style={styles.scrollTopButton}
                      onPress={() => scrollViewRef.current?.scrollTo({ y: 0, animated: true })}
                      accessibilityRole="button"
                      accessibilityLabel="Voltar ao topo"
                    >
                      <Text style={styles.scrollTopText}>↑</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              <View style={styles.bottomBar}>
                <TouchableOpacity
                  style={[styles.bottomNavButton, activeNavigationView === 'lost' && styles.bottomNavButtonActive]}
                  onPress={() => { setSelectedCategory('Todas'); setActiveView('lost'); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activeNavigationView === 'lost' }}
                >
                  <Text style={[styles.bottomNavText, activeNavigationView === 'lost' && styles.bottomNavTextActive]}>Perdidos</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.bottomNavButton, activeNavigationView === 'found' && styles.bottomNavButtonActive]}
                  onPress={() => { setSelectedCategory('Todas'); setActiveView('found'); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activeNavigationView === 'found' }}
                >
                  <Text style={[styles.bottomNavText, activeNavigationView === 'found' && styles.bottomNavTextActive]}>Achados</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.bottomNavButton, activeNavigationView === 'profile' && styles.bottomNavButtonActive]}
                  onPress={openProfile}
                  accessibilityRole="button"
                  accessibilityLabel="Perfil"
                  accessibilityState={{ selected: activeNavigationView === 'profile' }}
                >
                  <Image
                    source={profileImage ? { uri: profileImage } : DEFAULT_PROFILE_IMAGE}
                    style={styles.profileAvatar}
                    resizeMode="cover"
                  />
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
                <TouchableOpacity style={[styles.authModeButton, screen === 'login' && styles.authModeButtonActive]} onPress={() => setScreen('login')}>
                  <Text style={[styles.authModeText, screen === 'login' && styles.authModeTextActive]}>Entrar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.authModeButton, screen === 'register' && styles.authModeButtonActive]} onPress={() => setScreen('register')}>
                  <Text style={[styles.authModeText, screen === 'register' && styles.authModeTextActive]}>Criar conta</Text>
                </TouchableOpacity>
              </View>

              {screen === 'login' ? (
                <View style={styles.formBox}>
                  <Text style={styles.sectionTitle}>Boas-vindas</Text>
                  <Text style={styles.authFormIntro}>Entre na sua conta para continuar.</Text>
                  <TextInput style={styles.input} placeholder="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                  <TextInput style={styles.input} placeholder="Senha" value={password} onChangeText={setPassword} secureTextEntry />
                  <TouchableOpacity style={styles.buttonPrimary} onPress={handleLogin}>
                    <Text style={styles.buttonText}>Entrar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.formBox}>
                  <Text style={styles.sectionTitle}>Criar sua conta</Text>
                  <Text style={styles.authFormIntro}>Leva só um instante para começar.</Text>
                  <TextInput style={styles.input} placeholder="Nome completo" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
                  <TextInput style={styles.input} placeholder="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                  <TextInput style={styles.input} placeholder="Senha (mínimo 6 caracteres)" value={password} onChangeText={setPassword} secureTextEntry />
                  <TouchableOpacity style={styles.buttonPrimary} onPress={handleRegister}>
                    <Text style={styles.buttonText}>Criar conta</Text>
                  </TouchableOpacity>
                </View>
              )}

              {status.text ? (
                <Text style={[styles.message, status.type === 'error' ? styles.errorText : styles.successText]}>{status.text}</Text>
              ) : null}
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
    backgroundColor: '#F7F6FA',
  },
  screenScroll: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F6FA',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: '#F7F6FA',
  },
  containerWithFloatingActions: {
    paddingBottom: 104,
  },
  authContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 32,
    backgroundColor: '#F7F6FA',
  },
  authContent: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  authTitle: {
    color: '#24212B',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 6,
  },
  authIntro: {
    color: '#77727F',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  authFormIntro: {
    color: '#77727F',
    fontSize: 14,
    marginTop: -10,
    marginBottom: 18,
  },
  authModeRow: {
    minHeight: 52,
    flexDirection: 'row',
    backgroundColor: '#EAE7EF',
    borderRadius: 15,
    padding: 4,
    marginBottom: 16,
  },
  authModeButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  authModeButtonActive: {
    backgroundColor: '#6336C8',
  },
  authModeText: {
    color: '#77727F',
    fontWeight: '700',
  },
  authModeTextActive: {
    color: '#FFFFFF',
  },
  backButton: {
    alignSelf: 'flex-start',
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEE9F8',
    marginBottom: 12,
  },
  backButtonText: {
    color: '#5B2BBF',
    fontSize: 25,
    lineHeight: 28,
  },
  profileImageButton: {
    alignSelf: 'center',
    borderRadius: 72,
    borderWidth: 4,
    borderColor: '#E4DCF4',
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
    backgroundColor: '#E8E2F1',
  },
  changeImageText: {
    color: '#6336C8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'left',
    marginBottom: 18,
    color: '#24212B',
  },
  tabRow: {
    flexDirection: 'row',
    flex: 1,
    gap: 8,
    backgroundColor: 'transparent',
    marginBottom: 0,
  },
  tabButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#6336C8',
  },
  tabText: {
    color: '#77727F',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  formBox: {
    backgroundColor: '#ffffff',
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
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 18,
    color: '#24212B',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E1EA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 14,
    fontSize: 16,
    color: '#24212B',
  },
  authHint: {
    marginTop: -8,
    marginBottom: 14,
    color: '#527064',
    fontSize: 12,
    lineHeight: 17,
  },
  categoryPicker: {
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 8,
    backgroundColor: '#f8fbf9',
    borderWidth: 1,
    borderColor: '#cbded4',
    borderRadius: 12,
  },
  categoryPickerText: {
    fontSize: 16,
    color: '#153b2e',
  },
  categoryPlaceholder: {
    color: '#7b9187',
  },
  categoryOptions: {
    marginBottom: 14,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbded4',
    borderRadius: 12,
  },
  categoryOption: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5eee9',
  },
  categoryOptionSelected: {
    backgroundColor: '#e2eee9',
  },
  categoryOptionText: {
    fontSize: 15,
    color: '#527064',
  },
  categoryOptionTextSelected: {
    color: '#153b2e',
    fontWeight: '700',
  },
  buttonPrimary: {
    backgroundColor: '#6336C8',
    borderRadius: 14,
    minHeight: 48,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 18,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonLogout: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    minHeight: 48,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#E6E0F0',
  },
  buttonDelete: {
    backgroundColor: '#FFF3F2',
    borderRadius: 14,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F2D5D2',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  userText: {
    fontSize: 18,
    color: '#24212B',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 20,
  },
  profileSectionTabs: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: 16,
    borderRadius: 10,
    backgroundColor: '#e2eee9',
  },
  profileSectionTab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    borderRadius: 7,
  },
  profileSectionTabActive: {
    backgroundColor: '#ffffff',
  },
  profileSectionTabText: {
    color: '#527064',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  profileSectionTabTextActive: {
    color: '#153b2e',
    fontWeight: '700',
  },
  commentedItemsSection: {
    marginBottom: 10,
  },
  commentedItemsTitle: {
    marginBottom: 8,
    color: '#153b2e',
    fontSize: 18,
    fontWeight: '800',
  },
  commentedItemRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#d8e6df',
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  commentedItemImage: {
    width: 58,
    height: 58,
    flexShrink: 0,
    borderRadius: 7,
    backgroundColor: '#e2eee9',
  },
  commentedItemImagePlaceholder: {
    width: 58,
    height: 58,
    flexShrink: 0,
    borderRadius: 7,
    backgroundColor: '#e2eee9',
  },
  commentedItemInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },
  commentedItemName: {
    color: '#153b2e',
    fontSize: 15,
    fontWeight: '700',
  },
  commentedItemMeta: {
    marginTop: 5,
    color: '#527064',
    fontSize: 12,
  },
  commentedItemArrow: {
    marginLeft: 8,
    color: '#0f766e',
    fontSize: 26,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 18,
    marginTop: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9E5EF',
    shadowColor: '#25202D',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  detailBackButton: {
    minHeight: 42,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  detailBackText: {
    color: '#0f766e',
    fontSize: 15,
    fontWeight: '700',
  },
  detailImage: {
    width: '100%',
    height: 300,
    borderRadius: 14,
    backgroundColor: '#e2eee9',
  },
  detailImagePlaceholder: {
    width: '100%',
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#e2eee9',
  },
  detailPlaceholderText: {
    color: '#527064',
    fontSize: 14,
  },
  detailInformation: {
    paddingTop: 20,
    paddingBottom: 22,
  },
  detailType: {
    marginBottom: 7,
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '800',
  },
  detailTitle: {
    marginBottom: 10,
    color: '#153b2e',
    fontSize: 26,
    fontWeight: '800',
  },
  detailDescription: {
    color: '#36584a',
    fontSize: 16,
    lineHeight: 24,
  },
  detailDivider: {
    height: 1,
    marginVertical: 18,
    backgroundColor: '#d8e6df',
  },
  detailLabel: {
    marginTop: 9,
    marginBottom: 3,
    color: '#527064',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: '#153b2e',
    fontSize: 15,
    lineHeight: 22,
  },
  commentsSection: {
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#d8e6df',
  },
  commentsTitle: {
    marginBottom: 16,
    color: '#153b2e',
    fontSize: 21,
    fontWeight: '800',
  },
  emptyComments: {
    marginBottom: 14,
    color: '#527064',
    fontSize: 14,
    lineHeight: 21,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  commentThread: {
    marginBottom: 18,
  },
  commentAvatar: {
    width: 38,
    height: 38,
    flexShrink: 0,
    marginRight: 10,
    borderRadius: 19,
    backgroundColor: '#e2eee9',
  },
  commentContent: {
    flex: 1,
    paddingTop: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  commentAuthor: {
    marginBottom: 3,
    color: '#153b2e',
    fontSize: 14,
    fontWeight: '700',
  },
  commentText: {
    color: '#36584a',
    fontSize: 14,
    lineHeight: 21,
  },
  replyButton: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  replyButtonText: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '700',
  },
  showRepliesButton: {
    alignSelf: 'flex-start',
    minHeight: 36,
    justifyContent: 'center',
    paddingRight: 8,
  },
  showRepliesText: {
    color: '#0f766e',
    fontSize: 13,
    fontWeight: '700',
  },
  replyComposer: {
    marginLeft: 48,
    marginTop: 8,
  },
  replyInput: {
    minHeight: 68,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#cbded4',
    borderRadius: 9,
    backgroundColor: '#ffffff',
    color: '#153b2e',
    fontSize: 14,
  },
  replySubmitButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 7,
    borderRadius: 9,
    backgroundColor: '#0f766e',
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
    backgroundColor: '#e2eee9',
  },
  commentInput: {
    minHeight: 84,
    marginTop: 4,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#cbded4',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    color: '#153b2e',
    fontSize: 15,
  },
  commentSubmitButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 12,
    borderRadius: 10,
    backgroundColor: '#0f766e',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#24212B',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#77727F',
    lineHeight: 21,
  },
  itemImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
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
    color: '#0f766e',
    fontSize: 15,
    fontWeight: '700',
  },
  detailImage: {
    width: '100%',
    height: 290,
    borderRadius: 14,
    backgroundColor: '#e2eee9',
  },
  detailImagePlaceholder: {
    width: '100%',
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#e2eee9',
  },
  detailPlaceholderText: {
    color: '#527064',
    fontSize: 14,
  },
  detailInformation: {
    paddingTop: 20,
    paddingBottom: 24,
  },
  detailType: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '800',
  },
  detailTitle: {
    marginTop: 5,
    marginBottom: 10,
    color: '#153b2e',
    fontSize: 26,
    fontWeight: '800',
  },
  detailDescription: {
    color: '#36594b',
    fontSize: 16,
    lineHeight: 24,
  },
  detailDivider: {
    height: 1,
    marginVertical: 18,
    backgroundColor: '#d8e6df',
  },
  detailLabel: {
    marginTop: 10,
    color: '#71847b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailValue: {
    marginTop: 3,
    color: '#153b2e',
    fontSize: 16,
  },
  commentsSection: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#d8e6df',
  },
  commentsTitle: {
    marginBottom: 16,
    color: '#153b2e',
    fontSize: 21,
    fontWeight: '800',
  },
  emptyComments: {
    marginBottom: 16,
    color: '#71847b',
    fontSize: 14,
    lineHeight: 21,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  commentAvatar: {
    width: 38,
    height: 38,
    marginRight: 11,
    borderRadius: 19,
    backgroundColor: '#e2eee9',
  },
  commentContent: {
    flex: 1,
    minWidth: 0,
  },
  commentAuthor: {
    marginBottom: 3,
    color: '#153b2e',
    fontSize: 14,
    fontWeight: '700',
  },
  commentText: {
    color: '#36594b',
    fontSize: 14,
    lineHeight: 21,
  },
  commentInput: {
    minHeight: 88,
    maxHeight: 160,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#cbded4',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    color: '#153b2e',
    fontSize: 15,
  },
  commentSubmitButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: '#0f766e',
  },
  itemPreview: {
    width: 112,
    height: 112,
    borderRadius: 14,
    marginTop: 4,
    marginBottom: 14,
    alignSelf: 'center',
  },
  message: {
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorText: {
    color: '#B42318',
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
    color: '#24212B',
    marginBottom: 8,
  },
  confirmText: {
    color: '#77727F',
    marginBottom: 18,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#EEE9F8',
    borderRadius: 12,
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
    backgroundColor: '#B42318',
    borderRadius: 12,
    minHeight: 46,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  topBar: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E4EC',
    backgroundColor: '#FFFFFF',
  },
  floatingActions: {
    position: 'absolute',
    right: 18,
    bottom: 82,
    alignItems: 'flex-end',
    gap: 10,
    zIndex: 1,
  },
  floatingActionsEnd: {
    bottom: 82,
  },
  floatingAddButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#6336C8',
  },
  floatingAddButtonText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '500',
    lineHeight: 32,
  },
  addMenuContainer: {
    alignItems: 'flex-end',
    gap: 8,
  },
  addMenu: {
    minWidth: 176,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E8E4EC',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    elevation: 4,
  },
  addMenuOption: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  addMenuOptionText: {
    color: '#24212B',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollTopButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    elevation: 3,
  },
  scrollTopText: {
    color: '#24212B',
    fontSize: 22,
    fontWeight: '700',
  },
  bottomBar: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#E8E4EC',
    backgroundColor: '#FFFFFF',
    zIndex: 2,
  },
  bottomNavButton: {
    minWidth: 64,
    minHeight: 54,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  bottomNavButtonActive: {
    backgroundColor: '#F0EBF8',
  },
  bottomNavText: {
    color: '#77727F',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomNavTextActive: {
    color: '#6336C8',
  },
  profileNavButton: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 6,
  },
  profileNavText: {
    maxWidth: 72,
  },
  navProfileButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 0,
    marginBottom: 0,
    backgroundColor: '#E8E2F1',
  },
  navAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  eyebrow: {
    color: '#7656B5',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 1,
  },
  searchBox: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E2EC',
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
    backgroundColor: '#F0EBF8',
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
    backgroundColor: '#6336C8',
  },
  searchMark: {
    color: '#77727F',
    fontSize: 25,
    marginRight: 9,
  },
  searchInput: {
    flex: 1,
    minHeight: 50,
    color: '#24212B',
    fontSize: 15,
  },
  clearSearch: {
    color: '#77727F',
    fontSize: 24,
    paddingHorizontal: 4,
  },
  categoryRow: {
    height: 48,
    flexGrow: 0,
    alignItems: 'center',
    gap: 8,
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
    backgroundColor: '#6336C8',
  },
  categoryChipText: {
    color: '#68636F',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionHeadingTitle: {
    color: '#24212B',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E4EC',
    borderRadius: 8,
    marginBottom: 12,
  },
  itemImage: {
    width: '100%',
    height: 128,
    backgroundColor: '#E5E3E8',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E3E8',
  },
  placeholderMark: {
    color: '#77727F',
    fontSize: 36,
  },
  itemCardContent: {
    padding: 10,
  },
  itemTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  itemTypeBadgeLost: {
    backgroundColor: '#FFF0ED',
  },
  itemTypeBadgeFound: {
    backgroundColor: '#EAF5EF',
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
  itemCategoryBadge: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    marginBottom: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F0EBF8',
  },
  itemCategoryBadgeText: {
    color: '#6336C8',
    fontSize: 10,
    fontWeight: '700',
  },
  itemLocation: {
    color: '#7656B5',
    fontSize: 11,
    marginTop: 7,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 28,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E9E5EF',
  },
  emptyStateMark: {
    color: '#9B82CC',
    fontSize: 38,
    marginBottom: 8,
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
    marginBottom: 16,
    color: '#24212B',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  profileEmail: {
    color: '#77727F',
    fontSize: 14,
    marginTop: 0,
    marginBottom: 10,
    textAlign: 'center',
  },
  myItemsFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 14,
  },
  myItemsFilter: {
    minHeight: 38,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECE9F0',
    borderRadius: 12,
  },
  myItemsFilterActive: {
    backgroundColor: '#6336C8',
  },
  myItemsFilterText: {
    color: '#68636F',
    fontSize: 12,
    fontWeight: '700',
  },
  myItemsFilterTextActive: {
    color: '#FFFFFF',
  },
  profileAction: {
    width: '100%',
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E3EF',
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
    marginTop: 4,
  },
  actionArrow: {
    color: '#7656B5',
    fontSize: 28,
  },
  settingsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E3EF',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  settingsLabel: {
    color: '#89848F',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 14,
  },
  settingsRow: {
    gap: 4,
    paddingVertical: 8,
  },
  settingsOption: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  settingsEditLabel: {
    color: '#6336C8',
    fontSize: 13,
    fontWeight: '700',
  },
  profileEditForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E3EF',
    padding: 16,
    marginTop: 14,
  },
  cancelEditText: {
    color: '#77727F',
    fontSize: 14,
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
    color: '#6336C8',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDeleteText: {
    color: '#B42318',
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
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0ED',
  },
  removeImageText: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '700',
  },
});

