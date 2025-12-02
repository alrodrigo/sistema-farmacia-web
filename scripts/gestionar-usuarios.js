/**
 * Script para gestionar usuarios en Firebase Auth y Firestore
 * Uso: node scripts/gestionar-usuarios.js [comando]
 * Comandos: listar, eliminar-todos, crear-reales
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Inicializar Firebase Admin SDK
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

// Interfaz para leer input del usuario
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function pregunta(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Listar todos los usuarios
async function listarUsuarios() {
  console.log('\n📋 USUARIOS ACTUALES:\n');
  const listUsersResult = await auth.listUsers();
  
  for (const user of listUsersResult.users) {
    console.log(`✉️  Email: ${user.email}`);
    console.log(`   UID: ${user.uid}`);
    console.log(`   Creado: ${new Date(user.metadata.creationTime).toLocaleString()}`);
    console.log(`   Último login: ${user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : 'Nunca'}`);
    
    // Buscar documento en Firestore
    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        console.log(`   Rol en Firestore: ${data.role}`);
        console.log(`   Nombre: ${data.nombre || 'N/A'}`);
      } else {
        console.log(`   ⚠️  SIN DOCUMENTO EN FIRESTORE`);
      }
    } catch (error) {
      console.log(`   ❌ Error al leer Firestore: ${error.message}`);
    }
    console.log('');
  }
  
  console.log(`Total: ${listUsersResult.users.length} usuarios\n`);
}

// Eliminar todos los usuarios
async function eliminarTodos() {
  console.log('\n⚠️  ¿ESTÁS SEGURO DE ELIMINAR TODOS LOS USUARIOS?');
  const confirmacion = await pregunta('Escribe "SI" para confirmar: ');
  
  if (confirmacion.toUpperCase() !== 'SI') {
    console.log('❌ Operación cancelada');
    return;
  }
  
  console.log('\n🗑️  Eliminando usuarios...\n');
  const listUsersResult = await auth.listUsers();
  
  for (const user of listUsersResult.users) {
    try {
      // Eliminar de Auth
      await auth.deleteUser(user.uid);
      console.log(`✅ Eliminado de Auth: ${user.email}`);
      
      // Eliminar de Firestore
      await db.collection('users').doc(user.uid).delete();
      console.log(`✅ Eliminado de Firestore: ${user.email}`);
    } catch (error) {
      console.log(`❌ Error eliminando ${user.email}: ${error.message}`);
    }
  }
  
  console.log('\n✅ Todos los usuarios han sido eliminados\n');
}

// Crear usuarios reales
async function crearUsuariosReales() {
  console.log('\n👤 CREAR USUARIOS REALES\n');
  
  // Usuario Admin
  console.log('--- USUARIO ADMINISTRADOR ---');
  const adminEmail = await pregunta('Email del admin: ');
  const adminPassword = await pregunta('Contraseña del admin: ');
  const adminNombre = await pregunta('Nombre completo del admin: ');
  
  // Usuario Empleado
  console.log('\n--- USUARIO EMPLEADO ---');
  const empleadoEmail = await pregunta('Email del empleado: ');
  const empleadoPassword = await pregunta('Contraseña del empleado: ');
  const empleadoNombre = await pregunta('Nombre completo del empleado: ');
  
  console.log('\n📝 Confirmación de datos:');
  console.log(`\nAdmin: ${adminNombre} (${adminEmail})`);
  console.log(`Empleado: ${empleadoNombre} (${empleadoEmail})`);
  
  const confirmar = await pregunta('\n¿Crear estos usuarios? (SI/NO): ');
  
  if (confirmar.toUpperCase() !== 'SI') {
    console.log('❌ Operación cancelada');
    return;
  }
  
  console.log('\n🔨 Creando usuarios...\n');
  
  try {
    // Crear Admin en Auth
    const adminUser = await auth.createUser({
      email: adminEmail,
      password: adminPassword,
      emailVerified: false
    });
    console.log(`✅ Admin creado en Auth: ${adminEmail} (UID: ${adminUser.uid})`);
    
    // Crear Admin en Firestore
    await db.collection('users').doc(adminUser.uid).set({
      uid: adminUser.uid,
      email: adminEmail,
      nombre: adminNombre,
      role: 'admin',
      activo: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`✅ Admin creado en Firestore: ${adminEmail}`);
    
    // Crear Empleado en Auth
    const empleadoUser = await auth.createUser({
      email: empleadoEmail,
      password: empleadoPassword,
      emailVerified: false
    });
    console.log(`\n✅ Empleado creado en Auth: ${empleadoEmail} (UID: ${empleadoUser.uid})`);
    
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
    
    console.log('\n✅ ¡Usuarios creados exitosamente!');
    console.log('\n📧 CREDENCIALES CREADAS:');
    console.log(`\nAdmin: ${adminEmail} / ${adminPassword}`);
    console.log(`Empleado: ${empleadoEmail} / ${empleadoPassword}`);
    console.log('\n⚠️  GUARDA ESTAS CREDENCIALES EN UN LUGAR SEGURO\n');
    
  } catch (error) {
    console.log(`\n❌ Error creando usuarios: ${error.message}`);
  }
}

// Menú principal
async function main() {
  const comando = process.argv[2];
  
  try {
    switch (comando) {
      case 'listar':
        await listarUsuarios();
        break;
      
      case 'eliminar-todos':
        await eliminarTodos();
        break;
      
      case 'crear-reales':
        await crearUsuariosReales();
        break;
      
      default:
        console.log('\n📚 USO DEL SCRIPT:\n');
        console.log('node scripts/gestionar-usuarios.js [comando]\n');
        console.log('COMANDOS DISPONIBLES:');
        console.log('  listar          - Ver todos los usuarios');
        console.log('  eliminar-todos  - Eliminar todos los usuarios (⚠️  peligroso)');
        console.log('  crear-reales    - Crear usuarios admin y empleado reales\n');
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
}

main();
