# Notificações Push

Os avisos de comentários, respostas, item encontrado e item recuperado são gravados na central do usuário no Firestore. O Firebase Functions envia esses avisos pelo Expo Push Service. Solicitações de item achado são enviadas aos dispositivos registrados por contas de servidor. Os recibos do Expo são verificados a cada 15 minutos e tokens inválidos são removidos.

## Implantar o backend

O envio de Functions e o agendador de recibos exigem um projeto Firebase no plano Blaze.

1. Entre no Firebase CLI e selecione o projeto usado pelo app:

   ```sh
   npx firebase-tools@latest login
   npx firebase-tools@latest use achaai-a08e1
   ```

2. Instale as dependências e publique funções e regras do Firestore:

   ```sh
   npm --prefix functions install
   npx firebase-tools@latest deploy --only functions,firestore:rules
   ```

## Configurar Push pela EAS

O Expo Go abre o app nativamente, mas não recebe push remoto no Android. No Expo Go, o app mostra um alerta local para novos avisos enquanto está aberto. Para receber push em segundo plano, use um development build EAS em um aparelho físico.

1. Este repositório ainda não tem o arquivo `google-services.json`. No Firebase Console do projeto `achaai-a08e1`, cadastre um app Android com o pacote `com.meuapp` e baixe esse arquivo. Coloque-o na raiz do projeto e adicione `"googleServicesFile": "./google-services.json"` em `expo.android` no `app.json`. Sem o arquivo e essa configuração, o Android não consegue registrar o token FCM.

   ```sh
   npx expo prebuild
   ```

   O app contém pastas nativas `android/` e `ios/`; o EAS pode ignorar alterações de `app.json` nelas. `expo prebuild` aplica o plugin de notificações aos projetos nativos. Não use `--clean` sem antes revisar alterações nativas locais.

2. Entre na EAS e configure a credencial FCM v1 do mesmo projeto Firebase no EAS. O passo a passo está na [documentação de credenciais FCM v1](https://docs.expo.dev/push-notifications/fcm-credentials/). Para iOS, configure a chave APNs seguindo a [configuração de push do Expo](https://docs.expo.dev/push-notifications/push-notifications-setup/).

   ```sh
   npx eas-cli@latest login
   npx eas-cli@latest credentials -p android
   ```

3. Gere e instale o build de desenvolvimento:

   ```sh
   npx eas-cli@latest build --platform android --profile development
   ```

   Para iPhone, use `--platform ios` e uma conta Apple Developer.

4. Inicie o Metro para o build instalado:

   ```sh
   npm run start:dev-client -- --tunnel
   ```

## Abrir no Expo Go

Para abrir o app nativo no Expo Go, inicie o servidor e leia o QR code pelo leitor dentro do Expo Go:

```sh
npm start -- --tunnel
```

O comando `npm start` seleciona Expo Go. Use `npm run start:dev-client` somente com o development build instalado. Não abra o QR code pelo navegador nem inicie com `--web`.
