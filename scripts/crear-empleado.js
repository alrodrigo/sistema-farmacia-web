/**
 * Script rápido para crear un usuario empleado
 */

const admin = require('firebase-admin');

// Inicializar Firebase Admin SDK
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function crearEmpleado() {
  const empleadoEmail = 'vendedor@servisalud.com';
  const empleadoPassword = 'server';
  const empleadoNombre = 'Vendedor ServiSalud';
  
  try {
    console.log('\n🔨 Creando empleado...\n');
    
    // Crear Empleado en Auth
    const empleadoUser = await auth.createUser({
      email: empleadoEmail,
      password: empleadoPassword,
      emailVerified: false
    });
    console.log(`✅ Empleado creado en Auth: ${empleadoEmail} (UID: ${empleadoUser.uid})`);
    
    // Crear Empleado en Firestore
    await db.collection('users').doc(empleadoUser.uid).set({
      uid: empleadoUser.uid,
      email: empleadoEmail,
      nombre: empleadoNombre,
      role: 'empleado',
      activo: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`✅ Empleado creado en Firestore: ${empleadoEmail}`);
    
    console.log('\n✅ ¡Empleado creado exitosamente!');
    console.log('\n📧 CREDENCIALES:');
    console.log(`Email: ${empleadoEmail}`);
    console.log(`Contraseña: ${empleadoPassword}\n`);
    
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}\n`);
  }
  
  process.exit(0);
}

crearEmpleado();
