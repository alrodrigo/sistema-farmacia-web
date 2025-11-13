#!/usr/bin/env node

/**
 * Script para crear usuario administrador en Firebase
 * Uso: node scripts/crear-usuario-admin.js
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🔐 CREAR USUARIO ADMINISTRADOR');
console.log('================================\n');

// Mostrar instrucciones
console.log('📋 Este script te ayudará a crear un usuario administrador.');
console.log('   Necesitarás crear el usuario desde Firebase Console.\n');

console.log('🔗 Pasos para crear el usuario:\n');
console.log('1. Ve a: https://console.firebase.google.com/project/sistema-farmacia-web/authentication/users');
console.log('2. Haz clic en "Add user"');
console.log('3. Ingresa:');
console.log('   - Email: admin@farmacia.com (o el que prefieras)');
console.log('   - Password: (mínimo 6 caracteres)');
console.log('4. Haz clic en "Add user"');
console.log('5. COPIA el UID que se genera (lo necesitarás para el siguiente paso)\n');

rl.question('¿Ya creaste el usuario en Firebase Console? (s/n): ', (respuesta) => {
  if (respuesta.toLowerCase() !== 's') {
    console.log('\n⚠️  Por favor, crea el usuario en Firebase Console primero.');
    console.log('   Luego vuelve a ejecutar este script.\n');
    rl.close();
    return;
  }

  console.log('\n📝 Ahora vamos a crear el documento en Firestore...\n');

  rl.question('Ingresa el UID del usuario (el que copiaste): ', (uid) => {
    rl.question('Ingresa el email: ', (email) => {
      rl.question('Ingresa el nombre: ', (nombre) => {
        rl.question('Ingresa el apellido: ', (apellido) => {
          
          console.log('\n📊 Datos a crear en Firestore:\n');
          console.log(`Collection: users`);
          console.log(`Document ID: ${uid}`);
          console.log(`Campos:`);
          console.log(`  - first_name: ${nombre}`);
          console.log(`  - last_name: ${apellido}`);
          console.log(`  - email: ${email}`);
          console.log(`  - role: admin`);
          console.log(`  - created_at: [timestamp]`);
          
          console.log('\n🔗 Ahora ve a Firestore y crea el documento manualmente:\n');
          console.log('1. Ve a: https://console.firebase.google.com/project/sistema-farmacia-web/firestore/data');
          console.log('2. Si no existe, crea la colección "users"');
          console.log(`3. Crea un documento con ID: ${uid}`);
          console.log('4. Agrega los campos mostrados arriba');
          console.log('\n✅ Una vez hecho esto, podrás iniciar sesión en el sistema.\n');
          
          rl.close();
        });
      });
    });
  });
});
