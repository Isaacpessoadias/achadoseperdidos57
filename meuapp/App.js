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
  initializeAuth,
  inMemoryPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
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
  const [profileImage, setProfileImage] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [foundItems, setFoundItems] = useState([]);
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
    setFullName('');
    setEmail('');
    setPassword('');
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

  const renderItemList = (type) => {
    const filteredItems = foundItems.filter((item) => (item.type || 'found') === type);

    if (!filteredItems.length) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{type === 'lost' ? 'Nenhum item perdido ainda' : 'Nenhum item achado ainda'}</Text>
        </View>
      );
    }

    return filteredItems.map((item) => (
      <View style={styles.card} key={item.id}>
        {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.itemImage} /> : null}
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardText}>{item.description}</Text>
        <Text style={styles.cardText}>Local: {item.location}</Text>
        <Text style={styles.cardText}>Categoria: {item.category}</Text>
        <Text style={styles.cardText}>Tipo: {type === 'lost' ? 'Item perdido' : 'Item achado'}</Text>
      </View>
    ));
  };

  if (user) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar style="dark" />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.tabRow}>
              <TouchableOpacity style={[styles.tabButton, activeView === 'lost' && styles.tabButtonActive]} onPress={() => setActiveView('lost')}>
                <Text style={[styles.tabText, activeView === 'lost' && styles.tabTextActive]}>Itens Perdidos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tabButton, activeView === 'found' && styles.tabButtonActive]} onPress={() => setActiveView('found')}>
                <Text style={[styles.tabText, activeView === 'found' && styles.tabTextActive]}>Itens Achados</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tabButton, activeView === 'profile' && styles.tabButtonActive]} onPress={() => setActiveView('profile')}>
                <Text style={[styles.tabText, activeView === 'profile' && styles.tabTextActive]}>Perfil</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveView('profile')} style={styles.profileImageButton}>
                <Image source={profileImage ? { uri: profileImage } : DEFAULT_PROFILE_IMAGE} style={styles.profileImageHome} resizeMode="cover" />
              </TouchableOpacity>
            </View>

            {activeView === 'lost' && (
              <View>
                <Text style={styles.title}>Itens Perdidos</Text>
                <TouchableOpacity
                  style={styles.buttonPrimary}
                  onPress={() => {
                    setItemType('lost');
                    setActiveView('addItem');
                  }}
                  disabled={isUploading}
                >
                  <Text style={styles.buttonText}>Cadastrar Item Perdido</Text>
                </TouchableOpacity>
                {renderItemList('lost')}
              </View>
            )}

            {activeView === 'found' && (
              <View>
                <Text style={styles.title}>Itens Achados</Text>
                <TouchableOpacity
                  style={styles.buttonPrimary}
                  onPress={() => {
                    setItemType('found');
                    setActiveView('addItem');
                  }}
                  disabled={isUploading}
                >
                  <Text style={styles.buttonText}>Cadastrar Item Achado</Text>
                </TouchableOpacity>
                {renderItemList('found')}
              </View>
            )}

            {activeView === 'profile' && (
              <View>
                <TouchableOpacity onPress={() => setActiveView('lost')} style={styles.backButton}>
                  <Text style={styles.backButtonText}>{'←'}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Meu perfil</Text>
                <View style={styles.profileImageContainer}>
                  <TouchableOpacity style={styles.profileImageButton} onPress={handlePickProfileImage} disabled={isUploading}>
                    <Image source={profileImage ? { uri: profileImage } : DEFAULT_PROFILE_IMAGE} style={styles.profileImageHome} resizeMode="cover" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.changeImageText}>Toque na imagem para trocar</Text>
                <Text style={styles.userText}>{profileName || user.displayName || user.email}</Text>
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

                  {itemImage ? <Image source={{ uri: itemImage }} style={styles.itemPreview} /> : null}

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

            <TouchableOpacity style={styles.buttonLogout} onPress={handleLogout}>
              <Text style={styles.buttonText}>Sair</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.buttonDelete} onPress={() => setConfirmDelete(true)}>
              <Text style={styles.buttonText}>Excluir conta</Text>
            </TouchableOpacity>

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
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Achados e Perdidos</Text>

            <View style={styles.tabRow}>
              <TouchableOpacity style={[styles.tabButton, screen === 'login' && styles.tabButtonActive]} onPress={() => setScreen('login')}>
                <Text style={[styles.tabText, screen === 'login' && styles.tabTextActive]}>Entrar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tabButton, screen === 'register' && styles.tabButtonActive]} onPress={() => setScreen('register')}>
                <Text style={[styles.tabText, screen === 'register' && styles.tabTextActive]}>Cadastrar</Text>
              </TouchableOpacity>
            </View>

            {screen === 'login' ? (
              <View style={styles.formBox}>
                <Text style={styles.sectionTitle}>Login</Text>
                <TextInput style={styles.input} placeholder="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <TextInput style={styles.input} placeholder="Senha" value={password} onChangeText={setPassword} secureTextEntry />
                <TouchableOpacity style={styles.buttonPrimary} onPress={handleLogin}>
                  <Text style={styles.buttonText}>Entrar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.formBox}>
                <Text style={styles.sectionTitle}>Cadastro</Text>
                <TextInput style={styles.input} placeholder="Nome completo" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
                <TextInput style={styles.input} placeholder="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <TextInput style={styles.input} placeholder="Senha" value={password} onChangeText={setPassword} secureTextEntry />
                <TouchableOpacity style={styles.buttonPrimary} onPress={handleRegister}>
                  <Text style={styles.buttonText}>Cadastrar</Text>
                </TouchableOpacity>
              </View>
            )}

            {status.text ? (
              <Text style={[styles.message, status.type === 'error' ? styles.errorText : styles.successText]}>{status.text}</Text>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7f5',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f4f7f5',
  },
  authContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f4f7f5',
  },
  backButton: {
    alignSelf: 'flex-start',
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2eee9',
    marginBottom: 12,
  },
  backButtonText: {
    color: '#14532d',
    fontSize: 25,
    lineHeight: 28,
  },
  profileImageButton: {
    alignSelf: 'center',
    borderRadius: 72,
    borderWidth: 4,
    borderColor: '#b7d8c9',
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
    color: '#0f766e',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 22,
    color: '#153b2e',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#e2eee9',
    borderRadius: 14,
    padding: 5,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
  },
  tabText: {
    color: '#527064',
    fontWeight: '600',
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#153b2e',
  },
  formBox: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: '#d8e6df',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 18,
    color: '#153b2e',
  },
  input: {
    backgroundColor: '#f8fbf9',
    borderWidth: 1,
    borderColor: '#cbded4',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 14,
    fontSize: 16,
    color: '#153b2e',
  },
  buttonPrimary: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    minHeight: 48,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonLogout: {
    backgroundColor: '#b45349',
    borderRadius: 12,
    minHeight: 48,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDelete: {
    backgroundColor: '#b45349',
    borderRadius: 12,
    minHeight: 48,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  userText: {
    fontSize: 18,
    color: '#14532d',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginTop: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d8e6df',
    shadowColor: '#153b2e',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#153b2e',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#527064',
    lineHeight: 21,
  },
  itemImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
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
    color: '#b45349',
  },
  successText: {
    color: '#0f766e',
  },
  confirmBox: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#d8e6df',
    marginTop: 12,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#153b2e',
    marginBottom: 8,
  },
  confirmText: {
    color: '#527064',
    marginBottom: 18,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#e2eee9',
    borderRadius: 12,
    minHeight: 46,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  cancelButtonText: {
    color: '#153b2e',
    fontWeight: '700',
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: '#b45349',
    borderRadius: 12,
    minHeight: 46,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});

