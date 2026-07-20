#!/usr/bin/env node
import fs from "node:fs";
import process from "node:process";
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
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
let credential = applicationDefault();
if (options["service-account"]) {
  credential = cert(JSON.parse(fs.readFileSync(options["service-account"],"utf8")));
}
initializeApp({ credential, projectId:"rendicion-de-cuentas-6aceb" });
const db = getFirestore();
const hiddenStatuses = new Set(["draft","borrador","hidden","oculto","inactive","inactivo","archived","archivo"]);

function isRecord(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function isPublishedRecord(record) {
  if (!isRecord(record)) return true;
  if (record.visible === false || record.published === false || record.active === false) return false;
  const status = String(record.publicationStatus || record.status || "").trim().toLowerCase();
  return !hiddenStatuses.has(status);
}
function sanitize(value) {
  if (Array.isArray(value)) return value.filter(isPublishedRecord).map(sanitize);
  if (!isRecord(value)) return value;
  const result = {};
  for (const [key,item] of Object.entries(value)) {
    if (["unsubscribeToken","clientSecret","refreshToken","privateKey","accessToken"].includes(key)) continue;
    result[key] = sanitize(item);
  }
  return result;
}

const source = await db.collection("portalState").get();
if (source.empty) {
  const message = "No existen documentos en portalState. Inicie sesión como administrador y guarde el portal al menos una vez.";
  if (options["allow-empty"]) {
    console.warn(message);
    process.exit(0);
  }
  console.error(message);
  process.exit(2);
}
const batch = db.batch();
let copied = 0;
for (const doc of source.docs) {
  const data = doc.data();
  if (doc.id === "meta") continue;
  let parsed;
  try { parsed = JSON.parse(data.json); } catch { continue; }
  const publicValue = sanitize(parsed);
  const json = JSON.stringify(publicValue ?? null);
  batch.set(db.collection("portalPublicState").doc(doc.id),{
    schemaVersion:data.schemaVersion || 11.60,
    key:doc.id,
    json,
    bytes:Buffer.byteLength(json,"utf8"),
    updatedAt:FieldValue.serverTimestamp(),
    updatedAtMs:Date.now(),
    updatedBy:"scripts/publish-public-state.mjs"
  },{merge:false});
  copied += 1;
}
batch.set(db.collection("portalPublicState").doc("meta"),{
  schemaVersion:11.60,
  source:"RENDISAMP_PUBLIC",
  updatedAt:FieldValue.serverTimestamp(),
  updatedAtMs:Date.now(),
  version:Date.now(),
  updatedBy:"scripts/publish-public-state.mjs"
},{merge:true});
await batch.commit();
console.log(JSON.stringify({ok:true,copied,projectId:"rendicion-de-cuentas-6aceb"},null,2));
