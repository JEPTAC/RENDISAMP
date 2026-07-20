import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";

const root = process.cwd();
const required = [
  "index.html",
  "styles.css",
  "claude-design.css",
  "claude-design.js",
  "home-experience.js",
  "territory-experience.js",
  "stack-motion.js",
  "admin-popup.js",
  "portal-core-v11409.js",
  "firebase-auth-v11409.js",
  "firebase.json",
  ".firebaserc",
  "firestore.rules"
];

const failures = [];
const warnings = [];
for (const file of required) {
  if (!fs.existsSync(path.join(root,file))) failures.push(`Falta ${file}`);
}

const firebaseSource = fs.readFileSync(path.join(root,"firebase-auth-v11409.js"),"utf8");
if (!firebaseSource.includes('projectId: "rendicion-de-cuentas-6aceb"')) {
  failures.push("El projectId de Firebase no coincide.");
}
if (!firebaseSource.includes('messagingSenderId: "509564686428"')) {
  failures.push("El número de proyecto/remitente no coincide.");
}
if (firebaseSource.includes('const FIRESTORE_ARRAY_MARKER = "__')) {
  failures.push("El serializador activo todavía usa un campo reservado __…__.");
}
if (!firebaseSource.includes('const CLOUD_STATE_COLLECTION = "portalState"')) {
  failures.push("No está activo el almacenamiento dividido portalState.");
}

const firebaseJson = JSON.parse(fs.readFileSync(path.join(root,"firebase.json"),"utf8"));
if (firebaseJson?.firestore?.rules !== "firestore.rules") {
  failures.push("firebase.json no referencia firestore.rules.");
}
if (firebaseJson?.hosting?.public !== ".") {
  failures.push("Firebase Hosting no publica la raíz del portal.");
}

const htmlFiles = fs.readdirSync(root).filter(file => file.endsWith(".html"));
for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(root,file),"utf8");
  for (const match of html.matchAll(/(?:src|href)=["']([^"'#?]+)(?:[?#][^"']*)?["']/g)) {
    const reference = match[1];
    if (/^(?:https?:|data:|mailto:|tel:)/i.test(reference) || reference.includes("${")) continue;
    const normalizedReference = reference.replace(/^\.\//,"");
    const target = path.resolve(root,normalizedReference);
    if (!fs.existsSync(target)) {
      if (normalizedReference === "assets/fonts/Hullgaria.otf") warnings.push(`${file}: conserve el archivo tipográfico provisto por el usuario en ${normalizedReference}`);
      else failures.push(`${file}: referencia inexistente ${reference}`);
    }
  }
}

for (const file of fs.readdirSync(root).filter(file => file.endsWith(".js"))) {
  try {
    execFileSync(process.execPath,["--check",path.join(root,file)],{stdio:"pipe"});
  } catch (error) {
    failures.push(`${file}: JavaScript inválido`);
  }
}

if (failures.length) {
  console.error("VERIFICACIÓN FALLIDA");
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

warnings.forEach(item => console.warn(`ADVERTENCIA: ${item}`));
console.log(`VERIFICACIÓN CORRECTA: ${required.length} archivos críticos, ${htmlFiles.length} páginas y JavaScript válido.`);
