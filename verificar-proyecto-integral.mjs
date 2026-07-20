#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const pages = ["index.html","proyectos.html","ideas.html","noticias.html","noticia.html","recursos.html","vigencias.html","rendicion.html","rendicion-2025.html","rendicion-2026.html","rendicion-2027.html"];
const critical = [
  "portal-core-v11409.js","firebase-service.js","firebase-auth-v11409.js","firestore.rules",
  "drive-config.js","drive-service.js","drive-media-manager.js","portal-integral-v1160.css","portal-integral-v1160.js",
  "territory-experience.js","noticia.js","noticias.js","vigencias.js","resources.js","projects-psp.js",
  "assets/projects-running/projects-running.js","assets/projects-featured/banner.js","subscriptions.js","subscriptions-admin.js"
];
const failures = [];
for (const file of [...pages,...critical]) if (!fs.existsSync(path.join(root,file))) failures.push(`Falta ${file}`);
for (const page of pages) {
  const text = fs.readFileSync(path.join(root,page),"utf8");
  for (const required of ["11.60.0-integral-drive","portal-integral-v1160.css","drive-media-manager.js","portal-integral-v1160.js"]) {
    if (!text.includes(required)) failures.push(`${page} no carga ${required}`);
  }
}
const activeJs = critical.filter(file => file.endsWith(".js"));
for (const file of activeJs) {
  try { execFileSync(process.execPath,["--check",path.join(root,file)],{stdio:"pipe"}); }
  catch (error) { failures.push(`JavaScript inválido: ${file}\n${String(error.stderr || error.message)}`); }
}
const activeText = activeJs.map(file => fs.readFileSync(path.join(root,file),"utf8")).join("\n");
for (const pattern of ["firebase.storage(","getStorage(","uploadBytes(","storageBucket:"]) {
  if (activeText.includes(pattern)) failures.push(`Uso activo no permitido: ${pattern}`);
}
const rules = fs.readFileSync(path.join(root,"firestore.rules"),"utf8");
if (rules.includes("allow read, write: if true")) failures.push("Las reglas contienen allow read, write: if true");
for (const required of ["portalPublicState","isSuperAdmin()","portalSettings","subscriptions"]) if (!rules.includes(required)) failures.push(`Regla ausente: ${required}`);
const driveConfig = fs.readFileSync(path.join(root,"drive-config.js"),"utf8");
for (const folder of ["Inicio/Banners","Proyectos/Destacados","Noticias/Portadas","Mapa/Conozca cada lugar","Archivo Histórico","Participación/Adjuntos"]) if (!driveConfig.includes(folder)) failures.push(`Carpeta Drive no configurada: ${folder}`);
if (!driveConfig.replace(/\s/g,"").includes("makeFilesPublic:false")) failures.push("Drive no está configurado como privado por defecto");
if (failures.length) {
  console.error(JSON.stringify({ok:false,failures},null,2));
  process.exit(1);
}
console.log(JSON.stringify({ok:true,version:"11.60.0-integral-drive",pages:pages.length,criticalFiles:critical.length,activeJavaScript:activeJs.length},null,2));
