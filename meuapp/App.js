import React, { useEffect, useState } from 'react';

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
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  deleteUser,
  updateProfile,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBNhN0dklcvbPTwTA6MJxJ8cZzTz4bFH9c',
  authDomain: 'achados-e-perdidos-4ea7d.firebaseapp.com',
  projectId: 'achados-e-perdidos-4ea7d',
  storageBucket: 'achados-e-perdidos-4ea7d.firebasestorage.app',
  messagingSenderId: '377809757716',
  appId: '1:377809757716:web:3ba331d955e4581b422901',
  measurementId: 'G-PZ0LCCXPE5',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const DEFAULT_PROFILE_IMAGE = require('./android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.webp');

const uploadImage = async (uri, fileName) => {
  const data = new FormData();
  data.append('file', { uri, type: 'image/jpeg', name: fileName });
  data.append('upload_preset', 'Dynamic_folders');

  const response = await fetch('https://api.cloudinary.com/v1_1/com07vbi/image/upload', {
    method: 'POST',
    body: data,
  });
  const result = await response.json();

  if (!response.ok || !result.secure_url) {
    throw new Error('Não foi possível enviar a imagem.');
  }

  return result.secure_url;
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

export default function App() {
  const [screen, setScreen] = useState('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ type: '', text: '' });
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('profile');
  const [profileImage, setProfileImage] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [foundItems, setFoundItems] = useState([]);

  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemLocation, setItemLocation] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemImage, setItemImage] = useState(null);
  useEffect(() => {
    if (!user) {
      return;
    }

    const loadUserData = async () => {
      let profile = null;

      try {
        const profileSnapshot = await getDoc(doc(db, 'profiles', user.uid));
        profile = profileSnapshot.exists() ? profileSnapshot.data() : null;

        if (profile?.photoUrl) {
          setProfileImage(profile.photoUrl);
        }
      } catch (error) {
        setStatus({ type: 'error', text: getFirestoreError(error, 'carregar o perfil') });
      }

      setProfileName(profile?.name || user.displayName || '');

      try {
        const itemsSnapshot = await getDocs(collection(db, 'items'));
        const items = itemsSnapshot.docs
          .map((itemSnapshot) => ({ id: itemSnapshot.id, ...itemSnapshot.data() }))
          .sort((first, second) => (second.foundAt || '').localeCompare(first.foundAt || ''));
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
      const userData = userCredential.user;
      const normalizedName = fullName.trim();

      await updateProfile(userData, { displayName: normalizedName });
      await setDoc(doc(db, 'profiles', userData.uid), {
        name: normalizedName,
        email: userData.email,
        photoUrl: '',
      });

      setUser(userData);
      setProfileName(normalizedName);
      setProfileImage(null);
      setActiveView('home');
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
      setActiveView('home');
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
      setActiveView('home');
      setStatus({ type: 'success', text: 'Você saiu da conta com sucesso.' });
      clearForm();
      setScreen('login');
    } catch (error) {
      setStatus({ type: 'error', text: getFriendlyAuthError(error, 'sair da conta') });
    }
  };

  const handlePickProfileImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setStatus({ type: 'error', text: 'Permita o acesso às fotos para trocar sua imagem.' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const localUri = result.assets[0].uri;

        if (user) {
          const photoUrl = await uploadImage(localUri, `profile-${user.uid}.jpg`);
          await setDoc(
            doc(db, 'profiles', user.uid),
            { name: profileName || user.displayName || '', email: user.email || '', photoUrl },
            { merge: true },
          );
          setProfileImage(photoUrl);
          setStatus({ type: 'success', text: 'Foto de perfil salva com sucesso.' });
        }
      }
    } catch (error) {
      setStatus({ type: 'error', text: 'Não foi possível salvar a foto. Tente novamente.' });
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
      setActiveView('home');
      setStatus({ type: 'success', text: 'Sua conta foi excluída com sucesso.' });
      clearForm();
      setScreen('login');
      setConfirmDelete(false);
    } catch (error) {
      const code = error?.code || '';

      if (code === 'auth/requires-recent-login') {
        setStatus({
          type: 'error',
          text: 'Para excluir a conta, faça login novamente e tente outra vez.',
        });
        setConfirmDelete(false);
        return;
      }

      setStatus({ type: 'error', text: getFriendlyAuthError(error, 'excluir a conta') });
      setConfirmDelete(false);
    }
  };

  if (user && activeView === 'profile') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.authContainer}>
                      <TouchableOpacity onPress={() => setActiveView('home')} style={{marginBottom:10}}>
              <Text style={{fontSize:24}}>{'←'}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Meu perfil</Text>

          <View style={styles.profileImageContainer}>
            <TouchableOpacity style={styles.profileImageButton} onPress={handlePickProfileImage}>
              <Image
                source={profileImage ? { uri: profileImage } : DEFAULT_PROFILE_IMAGE}
                style={styles.profileImageHome}
                resizeMode="cover"
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.changeImageText}>Toque na imagem para trocar</Text>
          <Text style={styles.userText}>{profileName || user.displayName || user.email}</Text>

          <View style={styles.profileTabRow}>
            <View style={[styles.profileTabButton, styles.profileTabButtonActive]}>
              <Text style={[styles.tabText, styles.tabTextActive]}>Postagens de itens perdidos</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nenhuma postagem ainda</Text>
            <Text style={styles.cardText}>As postagens de itens perdidos aparecerão aqui.</Text>
          </View>

          {status.text ? (
            <Text style={[styles.message, status.type === 'error' ? styles.errorText : styles.successText]}>
              {status.text}
            </Text>
          ) : null}

          <TouchableOpacity style={styles.buttonLogout} onPress={handleLogout}>
            <Text style={styles.buttonText}>Sair</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.buttonDelete} onPress={() => setConfirmDelete(true)}>
            <Text style={styles.buttonText}>Excluir conta</Text>
          </TouchableOpacity>

          {confirmDelete && (
            <View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>Confirmar exclusão</Text>
              <Text style={styles.confirmText}>
                Essa ação apagará sua conta permanentemente. Deseja continuar?
              </Text>

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
      </SafeAreaView>
    );
  }

  if (user) {
    // Main menu after login
    if (activeView === 'home') {
      return (
        <SafeAreaView style={styles.safeArea}>
          <StatusBar style="dark" />
          <View style={styles.authContainer}>
                        <TouchableOpacity onPress={() => setActiveView('home')} style={{marginBottom:10}}>
              <Text style={{fontSize:24}}>{'←'}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Bem-vindo(a)!</Text>
            <View style={styles.profileImageContainer}>
              <Image
                source={profileImage ? { uri: profileImage } : DEFAULT_PROFILE_IMAGE}
                style={styles.profileImageHome}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.userText}>{profileName || user.displayName || user.email}</Text>
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tabButton, activeView === 'lost' && styles.tabButtonActive]}
                onPress={() => setActiveView('lost')}
              >
                <Text style={[styles.tabText, activeView === 'lost' && styles.tabTextActive]}>Itens Perdidos</Text>
              </TouchableOpacity>
            
            <TouchableOpacity
                style={[styles.tabButton, activeView === 'found' && styles.tabButtonActive]}
                onPress={() => setActiveView('found')}
              >
                <Text style={[styles.tabText, activeView === 'found' && styles.tabTextActive]}>Itens Achados</Text>
              </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tabButton, activeView === 'profile' && styles.tabButtonActive]}
                onPress={() => setActiveView('profile')}
              >
                <Text style={[styles.tabText, activeView === 'profile' && styles.tabTextActive]}>Perfil</Text>
              </TouchableOpacity>
            </View>
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
          </View>
        </SafeAreaView>
      );
    }
    if (activeView === 'lost') {
      return (
        <SafeAreaView style={styles.safeArea}>
          <StatusBar style="dark" />
          <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Itens Perdidos</Text>
            {/* Placeholder for lost items list */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Nenhum item perdido ainda</Text>
            </View>
            <TouchableOpacity style={styles.tabButton} onPress={() => setActiveView('home')}>
              <Text style={styles.tabText}>Voltar</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      );
    }
    if (activeView === 'found') {
      return (
        <SafeAreaView style={styles.safeArea}>
          <StatusBar style="dark" />
          <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Itens Achados</Text>
            <TouchableOpacity style={styles.buttonPrimary} onPress={() => setActiveView('addItem')}>
              <Text style={styles.buttonText}>Cadastrar Item</Text>
            </TouchableOpacity>
            {foundItems.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Nenhum item achado ainda</Text>
              </View>
            ) : (
              foundItems.map((item) => (
                <View style={styles.card} key={item.id}>
                  {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.itemImage} /> : null}
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardText}>{item.description}</Text>
                  <Text style={styles.cardText}>Local: {item.location}</Text>
                  <Text style={styles.cardText}>Categoria: {item.category}</Text>
                </View>
              ))
            )}
            <TouchableOpacity style={styles.tabButton} onPress={() => setActiveView('home')}>
              <Text style={styles.tabText}>Voltar</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      );
    }
    // Add Item view
    if (activeView === 'addItem') {
      const handlePickItemImage = async () => {
        try {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            setStatus({ type: 'error', text: 'Permita o acesso às fotos para escolher a imagem.' });
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
          });
          if (!result.canceled && result.assets?.[0]?.uri) {
            setItemImage(result.assets[0].uri);
          }
        } catch (e) {
          setStatus({ type: 'error', text: 'Erro ao escolher imagem.' });
        }
      };

      const handleAddItem = async () => {
        if (!itemName.trim() || !itemDescription.trim() || !itemLocation.trim() || !itemCategory.trim()) {
          setStatus({ type: 'error', text: 'Preencha todos os campos.' });
          return;
        }
        try {
          const imageUrl = itemImage ? await uploadImage(itemImage, `item-${Date.now()}.jpg`) : '';
          const itemData = {
            name: itemName,
            description: itemDescription,
            location: itemLocation,
            category: itemCategory,
            imageUrl,
            foundAt: new Date().toISOString(),
            userId: user ? user.uid : null,
          };
          const itemReference = await addDoc(collection(db, 'items'), itemData);
          setFoundItems((currentItems) => [{ id: itemReference.id, ...itemData }, ...currentItems]);
          setStatus({ type: 'success', text: 'Item cadastrado com sucesso.' });
          setItemName('');
          setItemDescription('');
          setItemLocation('');
          setItemCategory('');
          setItemImage(null);
          setActiveView('found');
        } catch (e) {
          setStatus({ type: 'error', text: getFirestoreError(e, 'salvar o item no Firestore') });
        }
      };

      return (
        <SafeAreaView style={styles.safeArea}>
          <StatusBar style="dark" />
          <ScrollView contentContainerStyle={styles.authContainer}>
            <Text style={styles.title}>Cadastrar Item</Text>
            <TextInput style={styles.input} placeholder="Nome" value={itemName} onChangeText={setItemName} />
            <TextInput style={styles.input} placeholder="Descrição" value={itemDescription} onChangeText={setItemDescription} />
            <TextInput style={styles.input} placeholder="Localização" value={itemLocation} onChangeText={setItemLocation} />
            <TextInput style={styles.input} placeholder="Categoria" value={itemCategory} onChangeText={setItemCategory} />
            <TouchableOpacity style={styles.buttonPrimary} onPress={handlePickItemImage}>
              <Text style={styles.buttonText}>Selecionar Imagem</Text>
            </TouchableOpacity>
            {itemImage && <Image source={{ uri: itemImage }} style={{ width: 100, height: 100, marginTop: 10 }} />}
            <TouchableOpacity style={styles.buttonPrimary} onPress={handleAddItem}>
              <Text style={styles.buttonText}>Salvar</Text>
            </TouchableOpacity>
            {status.text && (
              <Text style={[styles.message, status.type === 'error' ? styles.errorText : styles.successText]}>{status.text}</Text>
            )}
            <TouchableOpacity style={styles.tabButton} onPress={() => setActiveView('found')}>
              <Text style={styles.tabText}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      );
    }

    // Fallback (should not reach)
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Achados e Perdidos</Text>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabButton, screen === 'login' && styles.tabButtonActive]}
            onPress={() => setScreen('login')}
          >
            <Text style={[styles.tabText, screen === 'login' && styles.tabTextActive]}>Entrar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, screen === 'register' && styles.tabButtonActive]}
            onPress={() => setScreen('register')}
          >
            <Text style={[styles.tabText, screen === 'register' && styles.tabTextActive]}>Cadastrar</Text>
          </TouchableOpacity>
        </View>

        {screen === 'login' ? (
          <View style={styles.formBox}>
            <Text style={styles.sectionTitle}>Login</Text>

            <TextInput
              style={styles.input}
              placeholder="E-mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity style={styles.buttonPrimary} onPress={handleLogin}>
              <Text style={styles.buttonText}>Entrar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formBox}>
            <Text style={styles.sectionTitle}>Cadastro</Text>

            <TextInput
              style={styles.input}
              placeholder="Nome completo"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />

            <TextInput
              style={styles.input}
              placeholder="E-mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity style={styles.buttonPrimary} onPress={handleRegister}>
              <Text style={styles.buttonText}>Cadastrar</Text>
            </TouchableOpacity>
          </View>
        )}

        {status.text ? (
          <Text style={[styles.message, status.type === 'error' ? styles.errorText : styles.successText]}>
            {status.text}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f3f4f6',
  },
  authContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f3f4f6',
  },
  profileImageButton: {
    alignSelf: 'center',
    borderRadius: 72,
    borderWidth: 4,
    borderColor: '#d1fae5',
    marginBottom: 8,
  },
  profileImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileImageHome: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  changeImageText: {
    color: '#2563eb',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  profileTabRow: {
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    padding: 6,
    marginBottom: 18,
  },
  profileTabButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  profileTabButtonActive: {
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
    color: '#111827',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    padding: 6,
    marginBottom: 18,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
  },
  tabText: {
    color: '#4b5563',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#111827',
  },
  formBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    color: '#1f2937',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
    color: '#111827',
  },
  buttonPrimary: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonLogout: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDelete: {
    backgroundColor: '#7f1d1d',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 4,
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: '#b91c1c',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  userText: {
    fontSize: 18,
    color: '#065f46',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  cardText: {
    fontSize: 14,
    color: '#4b5563',
  },
  message: {
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorText: {
    color: '#b91c1c',
  },
  successText: {
    color: '#047857',
  },
});

