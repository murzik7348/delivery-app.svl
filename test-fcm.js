const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
// Service account key file
const serviceAccount = require('/Users/dimamurza/Downloads/deliveryapi-4523c-firebase-adminsdk-fbsvc-a147ef67bf.json');

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
});

// FCM token from the Android device
const deviceToken = 'fKwVfuRASn-pnIBddqmMCZ:APA91bFEA92hZ_DzlxLTlUwtIHxrocoqK59rNXvts6HFc-uBbRDOmPsqGV3oss9m90j5Z6WBKWjfsWTPJZ3xHQICnf5F4nQ2kPHdLCD_ptBa-cheM-meV8M';

const message = {
  token: deviceToken,
  notification: {
    title: '🔥 Firebase Test',
    body: 'Пуш працює напряму через Firebase!',
  },
  android: {
    priority: 'high',
    notification: {
      channelId: 'default',
      priority: 'max',
      defaultSound: true,
      defaultVibrateTimings: true,
    },
  },
};

console.log('📤 Надсилаємо тестовий пуш на Android...');

getMessaging().send(message)
  .then((response) => {
    console.log('✅ Успішно надіслано! Message ID:', response);
  })
  .catch((error) => {
    console.error('❌ Помилка:', error.code, '-', error.message);
    if (error.errorInfo) {
      console.error('   Деталі:', error.errorInfo);
    }
  });
