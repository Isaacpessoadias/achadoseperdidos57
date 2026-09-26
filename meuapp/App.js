/* eslint-disable */
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
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
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
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
    return `Permissão negada ao ${action}. Publique as regras do Firestore para profiles e items.`;
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

export default function App() {
  const [screen, setScreen] = useState('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ type: '', text: '' });
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('lost');
  const [profileReturnView, setProfileReturnView] = useState('lost');
  const [myItemFilter, setMyItemFilter] = useState('all');
  const [profileImage, setProfileImage] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [editingProfileField, setEditingProfileField] = useState('');
  const [profileNameDraft, setProfileNameDraft] = useState('');
  const [profileEmailDraft, setProfileEmailDraft] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [foundItems, setFoundItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [isUploading, setIsUploading] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemLocation, setItemLocation] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemImage, setItemImage] = useState(null);
  const [itemImageFile, setItemImageFile] = useState(null);
  const [itemType, setItemType] = useState('found');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setActiveView('lost');
      }
    });

    return unsubscribe;
  }, []);

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

  const clearForm = () => {

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
    setFullName('');
    setEmail('');
    setPassword('');
  };

  const openProfile = () => {
    setProfileReturnView(activeView === 'found' ? 'found' : 'lost');
    setActiveView('profile');
  };

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setStatus({ type: 'error', text: 'Preencha nome completo, e-mail e senha para cadastrar.' });
      return;
    }

    if (password.length < 6) {
      setStatus({ type: 'error', text: 'A senha precisa ter pelo menos 6 caracteres.' });
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
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

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
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

  const renderItemList = (type, ownItemsOnly = false) => {
    const filteredItems = foundItems.filter((item) => {
      const matchesType = type === 'all' || (item.type || 'found') === type;
      const matchesOwner = !ownItemsOnly || item.userId === user?.uid;
      const matchesCategory = selectedCategory === 'Todas' || item.category === selectedCategory;
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
            <View style={styles.itemCard} key={item.id}>
              {item.imageUrl
                ? <Image source={{ uri: item.imageUrl }} style={styles.itemImage} resizeMode="cover" />
                : <View style={styles.itemImagePlaceholder}><Text style={styles.placeholderMark}>◎</Text></View>}
              <View style={styles.itemCardContent}>
                <View style={[styles.itemTypeBadge, itemIsLost ? styles.itemTypeBadgeLost : styles.itemTypeBadgeFound]}>
                  <Text style={[styles.itemTypeBadgeText, itemIsLost ? styles.itemTypeBadgeTextLost : styles.itemTypeBadgeTextFound]}>
                    {itemIsLost ? 'Perdido' : 'Achado'}
                  </Text>
                </View>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardText} numberOfLines={2}>{item.description}</Text>
                <Text style={styles.itemLocation} numberOfLines={1}>{item.location}</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  if (user) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar style="dark" />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            {(activeView === 'lost' || activeView === 'found') && (
              <>
                <View style={styles.topBar}>
                  <View style={styles.tabRow}>
              <TouchableOpacity style={[styles.tabButton, activeView === 'found' && styles.tabButtonActive]} onPress={() => { setSelectedCategory('Todas'); setActiveView('found'); }}>
                <Text style={[styles.tabText, activeView === 'found' && styles.tabTextActive]}>Achados</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tabButton, activeView === 'lost' && styles.tabButtonActive]} onPress={() => { setSelectedCategory('Todas'); setActiveView('lost'); }}>
                <Text style={[styles.tabText, activeView === 'lost' && styles.tabTextActive]}>Perdidos</Text>
              </TouchableOpacity>
                  </View>
              <TouchableOpacity onPress={openProfile} style={[styles.profileImageButton, styles.navProfileButton]}>
                <Image source={profileImage ? { uri: profileImage } : DEFAULT_PROFILE_IMAGE} style={[styles.profileImageHome, styles.navAvatar]} resizeMode="cover" />
              </TouchableOpacity>
            </View>
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
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                  {['Todas', ...new Set(foundItems.map((item) => item.category).filter(Boolean))].map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]}
                      onPress={() => setSelectedCategory(category)}
                    >
                      <Text style={[styles.categoryChipText, selectedCategory === category && styles.categoryChipTextActive]}>{category}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {activeView === 'lost' && (
              <View>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionHeadingTitle}>Perdidos recentemente</Text>
                  <Text style={styles.resultCount}>{foundItems.filter((item) => item.type === 'lost').length} itens</Text>
                </View>
                <TouchableOpacity
                  style={styles.buttonPrimary}
                  onPress={() => {
                    setItemType('lost');
                    setActiveView('addItem');
                  }}
                  disabled={isUploading}
                >
                  <Text style={styles.buttonText}>+  Publicar item perdido</Text>
                </TouchableOpacity>
                {renderItemList('lost')}
              </View>
            )}

            {activeView === 'found' && (
              <View>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionHeadingTitle}>Achados recentemente</Text>
                  <Text style={styles.resultCount}>{foundItems.filter((item) => (item.type || 'found') === 'found').length} itens</Text>
                </View>
                <TouchableOpacity
                  style={styles.buttonPrimary}
                  onPress={() => {
                    setItemType('found');
                    setActiveView('addItem');
                  }}
                  disabled={isUploading}
                >
                  <Text style={styles.buttonText}>+  Publicar item achado</Text>
                </TouchableOpacity>
                {renderItemList('found')}
              </View>
            )}

            {activeView === 'profile' && (
              <View style={styles.profileScreen}>
                <TouchableOpacity onPress={() => setActiveView(profileReturnView)} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Voltar para a lista">
                  <Text style={styles.backButtonText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Meu perfil</Text>
                <View style={styles.profileHero}>
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
              </View>
            )}

            {activeView === 'addItem' && (
              <View>
                  <Text style={styles.title}>{itemType === 'lost' ? 'Cadastrar Item Perdido' : 'Cadastrar Item Achado'}</Text>
                  <TextInput style={styles.input} placeholder="Nome" value={itemName} onChangeText={setItemName} />
                  <TextInput style={styles.input} placeholder="Descrição" value={itemDescription} onChangeText={setItemDescription} />
                  <TextInput style={styles.input} placeholder="Localização" value={itemLocation} onChangeText={setItemLocation} />
                  <TextInput style={styles.input} placeholder="Categoria" value={itemCategory} onChangeText={setItemCategory} />

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
    backgroundColor: '#EAE7EF',
    borderRadius: 15,
    padding: 4,
    marginBottom: 0,
  },
  tabButton: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
  },
  tabText: {
    color: '#77727F',
    fontWeight: '600',
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
    paddingVertical: 13,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
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
    gap: 8,
    paddingBottom: 18,
  },
  categoryChip: {
    minHeight: 36,
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
  },
  profileHero: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 28,
  },
  profileEmail: {
    color: '#77727F',
    fontSize: 14,
    marginTop: -14,
    marginBottom: 10,
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

