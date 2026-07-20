#!/usr/bin/env node
import fs from "node:fs";
import process from "node:process";
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function args() {
  const values = {};
  for (let index = 2; index < process.argv.length; index += 1) {
    const key = process.argv[index];
    if (!key.startsWith("--")) continue;
    values[key.slice(2)] = process.argv[index + 1] && !process.argv[index + 1].startsWith("--")
      ? process.argv[++index]
      : true;
  }
  return values;
}

const options = args();
if (!options.email && !options.uid) {
  console.error("Uso: npm run set-superadmin -- --email correo@dominio.gov.co [--service-account ruta.json]");
  process.exit(1);
}

let credential = applicationDefault();
if (options["service-account"]) {
  const payload = JSON.parse(fs.readFileSync(options["service-account"], "utf8"));
  credential = cert(payload);
}

initializeApp({ credential, projectId:"rendicion-de-cuentas-6aceb" });
const auth = getAuth();
const db = getFirestore();
const user = options.uid ? await auth.getUser(options.uid) : await auth.getUserByEmail(options.email);
const claims = { ...(user.customClaims || {}), role:"super_admin", super_admin:true };
await auth.setCustomUserClaims(user.uid, claims);
await db.doc(`users/${user.uid}`).set({
  uid:user.uid,
  email:user.email || options.email || "",
  displayName:user.displayName || "Juan Esteban Pérez",
  role:"super_admin",
  active:true,
  updatedAt:FieldValue.serverTimestamp(),
  updatedBy:"scripts/set-superadmin.mjs"
},{merge:true});
await auth.revokeRefreshTokens(user.uid);
console.log(JSON.stringify({ok:true,uid:user.uid,email:user.email,role:"super_admin",projectId:"rendicion-de-cuentas-6aceb"},null,2));
console.log("El usuario debe cerrar sesión y volver a entrar para recibir el token actualizado.");
