(() => {
  const FIREBASE_VERSION = "12.15.0";
  const firebaseConfig = {
    apiKey: "AIzaSyD02YaIMxLO2IPAJYZdPY2cWUvpkZDRo2U",
    authDomain: "rendicion-de-cuentas-6aceb.firebaseapp.com",
    projectId: "rendicion-de-cuentas-6aceb",
    messagingSenderId: "509564686428",
    appId: "1:509564686428:web:4e1257b5305dd8b4c51699",
    measurementId: "G-BQ6DLM4ENY"
  };

  const runtime = {
    initialized:false,
    ready:false,
    connected:navigator.onLine,
    user:null,
    profile:null,
    profileSource:"",
    profileError:null,
    role:null,
    canWrite:false,
    isSuperAdmin:false,
    syncing:false,
    lastError:null,
    app:null,
    auth:null,
    db:null,
    modules:null,
    syncTimer:null,
    initPromise:null,
    authFirstReady:null
  };

  const EDITOR_ROLES = new Set(["super_admin","admin","editor"]);
  const emit = (name, detail = {}) => window.dispatchEvent(new CustomEvent(name, {detail}));
  const portal = () => window.Portal;

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  function normalizeRole(value) {
    const role = normalizeText(value);
    const aliases = {
      superadmin:"super_admin",
      super_administrador:"super_admin",
      superadministrador:"super_admin",
      administrador_principal:"super_admin",
      super_admin:"super_admin",
      admin:"admin",
      administrador:"admin",
      editor:"editor",
      invitado:"guest",
      visitante:"guest",
      viewer:"guest",
      guest:"guest",
      usuario:"guest"
    };
    return aliases[role] || "guest";
  }

  function roleLabel(role) {
    return {
      super_admin:"Superadministrador",
      admin:"Administrador",
      editor:"Editor",
      guest:"Invitado"
    }[normalizeRole(role)] || "Invitado";
  }

  function friendlyError(error) {
    const code = error?.code || "";
    const messages = {
      "auth/invalid-credential":"Correo o contraseña incorrectos.",
      "auth/user-not-found":"No existe un usuario con ese correo.",
      "auth/wrong-password":"La contraseña no es correcta.",
      "auth/email-already-in-use":"Ya existe una cuenta con ese correo.",
      "auth/invalid-email":"El correo electrónico no es válido.",
      "auth/weak-password":"La contraseña debe tener al menos 8 caracteres.",
      "auth/too-many-requests":"Se realizaron demasiados intentos. Espere unos minutos.",
      "auth/network-request-failed":"No fue posible conectarse con Firebase.",
      "auth/popup-closed-by-user":"La ventana de acceso se cerró antes de completar el proceso.",
      "auth/unauthorized-domain":"Debe autorizar el dominio de GitHub Pages en Firebase Authentication.",
      "permission-denied":"Las reglas de Firestore no permiten esta operación. Publique las reglas incluidas en el paquete.",
      "failed-precondition":"Firestore todavía no se encuentra configurado correctamente.",
      "resource-exhausted":"El contenido supera el tamaño seguro de Firestore. Use Google Drive para imágenes o archivos pesados.",
      "firebase/cdn-load-failed":"No fue posible cargar el SDK oficial de Firebase. Recargue sin caché y revise que la red permita www.gstatic.com."
    };
    return messages[code] || error?.message || "Ocurrió un error al comunicarse con Firebase.";
  }

  async function loadModules() {
    /*
     * Firebase documenta actualmente la distribución ESM de navegador
     * mediante el CDN de gstatic. Se mantienen URLs literales para que
     * GitHub Pages y el navegador resuelvan correctamente los módulos.
     */
    try {
      const [app, auth, firestore] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js")
      ]);
      return {app,auth,firestore};
    } catch (error) {
      const wrapped = new Error(
        "No fue posible cargar Firebase desde el CDN oficial. " +
        "Recargue la página sin caché y verifique que el navegador o la red no bloqueen gstatic.com."
      );
      wrapped.code = "firebase/cdn-load-failed";
      wrapped.cause = error;
      throw wrapped;
    }
  }

  function authDetail(extra = {}) {
    return {
      user:runtime.user,
      profile:runtime.profile,
      profileSource:runtime.profileSource,
      profileError:runtime.profileError ? friendlyError(runtime.profileError) : "",
      role:runtime.role,
      roleLabel:roleLabel(runtime.role),
      canWrite:runtime.canWrite,
      isSuperAdmin:runtime.isSuperAdmin,
      emailVerified:Boolean(runtime.user?.emailVerified),
      ...extra
    };
  }

  async function init() {
    if (runtime.ready) return runtime;
    if (runtime.initPromise) return runtime.initPromise;

    runtime.initialized = true;
    runtime.initPromise = (async () => {
      try {
        runtime.modules = await loadModules();
        runtime.app = runtime.modules.app.initializeApp(firebaseConfig);
        runtime.auth = runtime.modules.auth.getAuth(runtime.app);

        /*
         * Algunas redes, antivirus y proxies reinician los canales
         * WebChannel de Firestore. Se fuerza únicamente long polling.
         * No se combina con experimentalAutoDetectLongPolling.
         */
        runtime.db = runtime.modules.firestore.initializeFirestore(
          runtime.app,
          {
            experimentalForceLongPolling:true,
            experimentalLongPollingOptions:{
              timeoutSeconds:20
            },
            ignoreUndefinedProperties:true
          }
        );

        runtime.transport = "forced-long-polling";
        runtime.auth.languageCode = "es";

        await runtime.modules.auth.setPersistence(
          runtime.auth,
          runtime.modules.auth.browserLocalPersistence
        );

        runtime.authFirstReady = new Promise(resolve => {
          let first = true;
          runtime.modules.auth.onAuthStateChanged(
            runtime.auth,
            async user => {
              await handleAuthState(user, {reason:first ? "initial" : "change"});
              if (first) {
                first = false;
                resolve();
              }
            },
            error => {
              runtime.lastError = error;
              runtime.profileError = error;
              emit("firebase:auth", authDetail({reason:"observer_error"}));
              if (first) {
                first = false;
                resolve();
              }
            }
          );
        });

        await runtime.authFirstReady;
        await hydrateFromCloud();

        runtime.ready = true;
        emit("firebase:ready", {
          connected:runtime.connected,
          projectId:firebaseConfig.projectId
        });
      } catch (error) {
        runtime.lastError = error;
        runtime.ready = false;
        emit("firebase:ready", {
          connected:false,
          error:friendlyError(error)
        });
        console.warn("[Firebase] No fue posible inicializar.", error);
      }
      return runtime;
    })();

    return runtime.initPromise;
  }

  async function readProfile(user) {
    const {doc,getDoc} = runtime.modules.firestore;
    const uidReference = doc(runtime.db,"users",user.uid);
    const uidSnapshot = await getDoc(uidReference);

    if (uidSnapshot.exists()) {
      return {
        data:uidSnapshot.data(),
        docId:user.uid,
        source:"uid"
      };
    }

    if (user.email) {
      const emailReference = doc(runtime.db,"users",user.email);
      const emailSnapshot = await getDoc(emailReference);
      if (emailSnapshot.exists()) {
        return {
          data:emailSnapshot.data(),
          docId:user.email,
          source:"email_legacy"
        };
      }
    }

    return null;
  }

  function buildGuestProfile(user, values = {}) {
    return {
      uid:user.uid,
      displayName:String(values.displayName || user.displayName || "").slice(0,120),
      email:String(user.email || values.email || "").toLowerCase(),
      role:"guest",
      active:true,
      emailVerified:Boolean(user.emailVerified),
      phone:String(values.phone || "").slice(0,40),
      neighborhood:String(values.neighborhood || "").slice(0,120),
      createdAt:runtime.modules.firestore.serverTimestamp(),
      updatedAt:runtime.modules.firestore.serverTimestamp(),
      lastLoginAt:runtime.modules.firestore.serverTimestamp()
    };
  }

  async function createGuestProfile(user, values = {}) {
    const {doc,setDoc} = runtime.modules.firestore;
    const data = buildGuestProfile(user, values);
    await setDoc(doc(runtime.db,"users",user.uid),data,{merge:true});
    return {
      data:{...data, createdAt:null, updatedAt:null, lastLoginAt:null},
      docId:user.uid,
      source:"created_guest"
    };
  }

  async function migrateLegacyProfile(user, profile, normalizedRole) {
    const {doc,setDoc,serverTimestamp} = runtime.modules.firestore;
    const data = profile.data || {};
    const canonical = {
      ...data,
      uid:user.uid,
      email:String(user.email || data.email || "").toLowerCase(),
      displayName:data.displayName || data.name || data.nombre || user.displayName || "",
      role:normalizedRole,
      active:data.active !== false,
      emailVerified:Boolean(user.emailVerified),
      migratedFrom:profile.docId,
      migratedAt:serverTimestamp(),
      updatedAt:serverTimestamp(),
      lastLoginAt:serverTimestamp()
    };
    await setDoc(doc(runtime.db,"users",user.uid),canonical,{merge:true});
    return {
      data:canonical,
      docId:user.uid,
      source:"migrated_to_uid"
    };
  }

  async function handleAuthState(user, options = {}) {
    runtime.user = user || null;
    runtime.profile = null;
    runtime.profileSource = "";
    runtime.profileError = null;
    runtime.role = null;
    runtime.canWrite = false;
    runtime.isSuperAdmin = false;

    if (!user) {
      emit("firebase:auth", authDetail(options));
      return;
    }

    try {
      let profile = await readProfile(user);

      if (!profile) {
        profile = await createGuestProfile(user);
      }

      let tokenClaims = {};
      try {
        tokenClaims = (await runtime.modules.auth.getIdTokenResult(user, options.forceTokenRefresh === true)).claims || {};
      } catch (claimError) {
        console.warn("[Firebase] No fue posible leer las reclamaciones del token.", claimError);
      }

      const rawRole =
        tokenClaims.role
        ?? tokenClaims.userRole
        ?? (tokenClaims.super_admin === true ? "super_admin" : null)
        ?? (tokenClaims.admin === true ? "admin" : null)
        ?? profile.data?.role
        ?? profile.data?.rol
        ?? profile.data?.tipoUsuario
        ?? profile.data?.userRole
        ?? "guest";

      const normalizedRole = normalizeRole(rawRole);

      if (
        profile.source === "email_legacy"
        || normalizeText(rawRole) !== normalizedRole
        || !profile.data?.uid
      ) {
        try {
          profile = await migrateLegacyProfile(user,profile,normalizedRole);
        } catch (migrationError) {
          console.warn("[Firebase] El perfil se leyó, pero no fue posible normalizarlo.",migrationError);
        }
      } else {
        const {doc,setDoc,serverTimestamp} = runtime.modules.firestore;
        await setDoc(
          doc(runtime.db,"users",user.uid),
          {
            emailVerified:Boolean(user.emailVerified),
            lastLoginAt:serverTimestamp(),
            updatedAt:serverTimestamp()
          },
          {merge:true}
        ).catch(() => {});
      }

      runtime.profile = {
        ...profile.data,
        uid:user.uid,
        docId:profile.docId,
        email:user.email || profile.data?.email || "",
        displayName:profile.data?.displayName || profile.data?.name || profile.data?.nombre || user.displayName || "",
        role:normalizedRole,
        active:profile.data?.active !== false,
        tokenClaims
      };
      runtime.profileSource = profile.source;
      runtime.role = normalizedRole;
      runtime.canWrite = runtime.profile.active && EDITOR_ROLES.has(normalizedRole);
      runtime.isSuperAdmin = runtime.profile.active && normalizedRole === "super_admin";
    } catch (error) {
      runtime.lastError = error;
      runtime.profileError = error;
      console.warn("[Firebase] No fue posible leer el perfil del usuario.",error);
    }

    emit("firebase:auth", authDetail(options));
  }

  async function signInEmail(email,password) {
    if (!runtime.ready) await init();
    const credential = await runtime.modules.auth.signInWithEmailAndPassword(
      runtime.auth,
      String(email || "").trim(),
      String(password || "")
    );
    await handleAuthState(credential.user,{reason:"email_login"});
    return credential;
  }

  async function signInGoogle() {
    if (!runtime.ready) await init();
    const provider = new runtime.modules.auth.GoogleAuthProvider();
    provider.setCustomParameters({prompt:"select_account"});
    const credential = await runtime.modules.auth.signInWithPopup(runtime.auth,provider);
    await handleAuthState(credential.user,{reason:"google_login"});
    return credential;
  }

  async function registerEmail(values = {}) {
    if (!runtime.ready) await init();

    const displayName = String(values.displayName || "").trim();
    const email = String(values.email || "").trim().toLowerCase();
    const password = String(values.password || "");

    if (displayName.length < 3) {
      throw new Error("Escriba su nombre completo.");
    }
    if (password.length < 8) {
      const error = new Error("La contraseña debe tener al menos 8 caracteres.");
      error.code = "auth/weak-password";
      throw error;
    }

    const credential = await runtime.modules.auth.createUserWithEmailAndPassword(
      runtime.auth,
      email,
      password
    );

    await runtime.modules.auth.updateProfile(credential.user,{displayName});
    await createGuestProfile(credential.user,{
      displayName,
      phone:values.phone || "",
      neighborhood:values.neighborhood || ""
    });

    try {
      await runtime.modules.auth.sendEmailVerification(credential.user);
    } catch (verificationError) {
      console.warn("[Firebase] La cuenta se creó, pero no se envió la verificación.",verificationError);
    }

    await credential.user.reload().catch(() => {});
    await handleAuthState(runtime.auth.currentUser || credential.user,{reason:"registration"});
    return credential;
  }

  async function resendVerification() {
    if (!runtime.auth?.currentUser) throw new Error("Debe iniciar sesión.");
    await runtime.modules.auth.sendEmailVerification(runtime.auth.currentUser);
  }

  async function sendPasswordReset(email) {
    if (!runtime.ready) await init();
    const value = String(email || "").trim();
    if (!value) throw new Error("Escriba el correo de la cuenta.");
    await runtime.modules.auth.sendPasswordResetEmail(runtime.auth,value);
  }

  async function updateOwnProfile(values = {}) {
    if (!runtime.auth?.currentUser) throw new Error("Debe iniciar sesión.");

    const user = runtime.auth.currentUser;
    const displayName = String(values.displayName || "").trim().slice(0,120);
    if (displayName) {
      await runtime.modules.auth.updateProfile(user,{displayName});
    }

    const {doc,setDoc,serverTimestamp} = runtime.modules.firestore;
    await setDoc(
      doc(runtime.db,"users",user.uid),
      {
        displayName:displayName || user.displayName || "",
        phone:String(values.phone || "").slice(0,40),
        neighborhood:String(values.neighborhood || "").slice(0,120),
        updatedAt:serverTimestamp()
      },
      {merge:true}
    );

    await handleAuthState(user,{reason:"profile_update"});
  }

  async function signOutUser() {
    if (!runtime.auth) return;
    await runtime.modules.auth.signOut(runtime.auth);
  }

  async function listUserProfiles() {
    if (!runtime.ready) await init();
    if (!runtime.isSuperAdmin) {
      throw Object.assign(
        new Error("Solo el superadministrador puede consultar y gestionar usuarios."),
        {code:"permission-denied"}
      );
    }

    const {collection,getDocs} = runtime.modules.firestore;
    const snapshot = await getDocs(collection(runtime.db,"users"));
    const profiles = snapshot.docs.map(item => {
      const data = item.data();
      const rawRole =
        data.role
        ?? data.rol
        ?? data.tipoUsuario
        ?? data.userRole
        ?? "guest";

      return {
        docId:item.id,
        uid:data.uid || (item.id.includes("@") ? "" : item.id),
        displayName:data.displayName || data.name || data.nombre || "Usuario sin nombre",
        email:data.email || (item.id.includes("@") ? item.id : ""),
        role:normalizeRole(rawRole),
        roleLabel:roleLabel(rawRole),
        active:data.active !== false,
        emailVerified:Boolean(data.emailVerified),
        createdAt:data.createdAt?.toDate?.()?.toISOString?.() || "",
        lastLoginAt:data.lastLoginAt?.toDate?.()?.toISOString?.() || "",
        legacy:item.id.includes("@")
      };
    });

    const deduplicated = new Map();
    profiles.forEach(profile => {
      const key = profile.email || profile.uid || profile.docId;
      const current = deduplicated.get(key);
      if (!current || (current.legacy && !profile.legacy)) {
        deduplicated.set(key,profile);
      }
    });

    return [...deduplicated.values()].sort((a,b) => {
      const roleOrder = {super_admin:0,admin:1,editor:2,guest:3};
      return (roleOrder[a.role] - roleOrder[b.role])
        || a.displayName.localeCompare(b.displayName,"es");
    });
  }

  async function updateUserAccess(profile, values = {}) {
    if (!runtime.ready) await init();
    if (!runtime.isSuperAdmin) {
      throw Object.assign(
        new Error("Solo el superadministrador puede cambiar roles."),
        {code:"permission-denied"}
      );
    }

    const target = typeof profile === "string" ? {docId:profile} : profile;
    const role = normalizeRole(values.role);
    const active = values.active !== false;

    const isCurrent =
      target.uid === runtime.user?.uid
      || (target.email && target.email === runtime.user?.email)
      || target.docId === runtime.user?.uid
      || target.docId === runtime.user?.email;

    if (isCurrent && (role !== "super_admin" || !active)) {
      throw new Error("No puede quitarse a sí mismo el rol de superadministrador ni desactivar su propia cuenta.");
    }

    const {doc,writeBatch,serverTimestamp} = runtime.modules.firestore;
    const batch = writeBatch(runtime.db);
    const targets = new Set(
      [target.uid,target.docId]
        .filter(Boolean)
    );

    targets.forEach(id => {
      batch.set(
        doc(runtime.db,"users",id),
        {
          uid:target.uid || (id.includes("@") ? "" : id),
          email:target.email || (id.includes("@") ? id : ""),
          displayName:target.displayName || "",
          role,
          active,
          updatedAt:serverTimestamp(),
          updatedBy:runtime.user.uid
        },
        {merge:true}
      );
    });

    await batch.commit();

    const {addDoc,collection} = runtime.modules.firestore;
    await addDoc(collection(runtime.db,"auditLogs"),{
      action:"user_access_update",
      targetUserId:target.uid || target.docId,
      targetEmail:target.email || "",
      role,
      active,
      userId:runtime.user.uid,
      email:runtime.user.email || "",
      createdAt:serverTimestamp(),
      page:location.pathname
    });

    if (isCurrent) {
      await handleAuthState(runtime.auth.currentUser,{reason:"access_update"});
    }

    emit("firebase:users",{action:"updated",profile:{...target,role,active}});
    return {...target,role,active};
  }


  const FIRESTORE_ARRAY_MARKER = "sp_firestore_array_v1";
  const LEGACY_FIRESTORE_ARRAY_MARKER = "__sp_firestore_array_v1__";
  const CLOUD_SCHEMA_VERSION = 11.41;
  const CLOUD_STATE_COLLECTION = "portalState";
  const CLOUD_PUBLIC_COLLECTION = "portalPublicState";
  const CLOUD_EDITS_COLLECTION = "portalEdits";
  const CLOUD_MAX_DOCUMENT_BYTES = 850_000;
  const CLOUD_STATE_KEYS = Object.freeze([
    "years",
    "resources",
    "dashboards",
    "commitments",
    "citizenRequests",
    "news",
    "settings",
    "content",
    "pageSettings"
  ]);

  function isPlainRecord(value) {
    if (!value || typeof value !== "object") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function encodeFirestoreValue(value, directArrayItem = false) {
    if (Array.isArray(value)) {
      const items = value.map(item => encodeFirestoreValue(item, true));
      return directArrayItem
        ? {[FIRESTORE_ARRAY_MARKER]:items}
        : items;
    }

    if (isPlainRecord(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key,item]) => [
          key,
          encodeFirestoreValue(item, false)
        ])
      );
    }

    return value;
  }

  function decodeFirestoreValue(value) {
    if (Array.isArray(value)) {
      return value.map(item => decodeFirestoreValue(item));
    }

    if (isPlainRecord(value)) {
      const marker = value[FIRESTORE_ARRAY_MARKER]
        ?? value[LEGACY_FIRESTORE_ARRAY_MARKER];
      const keys = Object.keys(value);
      if (
        keys.length === 1
        && Array.isArray(marker)
        && (
          keys[0] === FIRESTORE_ARRAY_MARKER
          || keys[0] === LEGACY_FIRESTORE_ARRAY_MARKER
        )
      ) {
        return marker.map(item => decodeFirestoreValue(item));
      }

      return Object.fromEntries(
        Object.entries(value).map(([key,item]) => [
          key,
          decodeFirestoreValue(item)
        ])
      );
    }

    return value;
  }

  function utf8Size(value) {
    return new TextEncoder().encode(String(value || "")).byteLength;
  }

  function safeJsonParse(value, fallback = null) {
    try {
      return JSON.parse(String(value || ""));
    } catch {
      return fallback;
    }
  }

  function prepareCloudState() {
    const state = portal()?.state;
    if (!state) throw new Error("El estado del portal no está disponible.");

    const content = isPlainRecord(state.content)
      ? {...state.content}
      : {};
    const contextEdits = isPlainRecord(content.contextEdits)
      ? content.contextEdits
      : {};
    delete content.contextEdits;

    return {
      sections:{
        years:state.years,
        resources:state.resources,
        dashboards:state.dashboards,
        commitments:state.commitments,
        citizenRequests:state.citizenRequests,
        news:state.news,
        settings:state.settings,
        content,
        pageSettings:state.pageSettings
      },
      contextEdits
    };
  }

  function isPublicRecord(record) {
    if (!record || typeof record !== "object") return true;
    if (record.hidden === true || record.active === false || record.visible === false || record.published === false) return false;
    const status = String(record.publicationStatus || record.publishStatus || "").toLowerCase();
    return !["draft","borrador","hidden","oculto","unpublished","no publicado"].includes(status);
  }

  function publicArray(value) {
    return Array.isArray(value) ? value.filter(isPublicRecord).map(item => sanitizePublicValue(item)) : value;
  }

  function sanitizePublicValue(value) {
    if (Array.isArray(value)) return publicArray(value);
    if (!isPlainRecord(value)) return value;
    const result = {};
    Object.entries(value).forEach(([key,item]) => {
      if (["unsubscribeToken","clientSecret","refreshToken","privateKey","accessToken"].includes(key)) return;
      result[key] = sanitizePublicValue(item);
    });
    return result;
  }

  function preparePublicSections(sections) {
    return Object.fromEntries(Object.entries(sections).map(([key,value]) => [key,sanitizePublicValue(value)]));
  }

  function serializeCloudDocument(value, label) {
    const json = JSON.stringify(value ?? null);
    const bytes = utf8Size(json);
    if (bytes > CLOUD_MAX_DOCUMENT_BYTES) {
      const error = new Error(
        `El bloque ${label} ocupa ${(bytes / 1024).toFixed(0)} KB y supera el límite seguro de Firestore. ` +
        "Retire imágenes incrustadas en base64 o súbalas mediante Google Drive."
      );
      error.code = "resource-exhausted";
      throw error;
    }
    return {json,bytes};
  }

  async function readStructuredCloudState() {
    const {collection,getDocs} = runtime.modules.firestore;
    const stateCollection = runtime.canWrite ? CLOUD_STATE_COLLECTION : CLOUD_PUBLIC_COLLECTION;
    const [stateSnapshot,editsSnapshot] = await Promise.all([
      getDocs(collection(runtime.db,stateCollection)),
      getDocs(collection(runtime.db,CLOUD_EDITS_COLLECTION))
    ]);

    if (stateSnapshot.empty) return null;

    const remote = {};
    let remoteVersion = 0;
    let validSections = 0;

    stateSnapshot.docs.forEach(snapshot => {
      const data = snapshot.data() || {};
      remoteVersion = Math.max(
        remoteVersion,
        Number(data.updatedAtMs || 0),
        Number(data.version || 0)
      );
      if (!CLOUD_STATE_KEYS.includes(snapshot.id)) return;
      if (typeof data.json !== "string") return;
      const parsed = safeJsonParse(data.json,undefined);
      if (parsed === undefined) return;
      remote[snapshot.id] = parsed;
      validSections += 1;
    });

    if (!validSections) return null;

    const hasContentDocument = Object.prototype.hasOwnProperty.call(remote,"content");
    const content = isPlainRecord(remote.content)
      ? {...remote.content}
      : {};
    const contextualEdits = {};

    editsSnapshot.docs.forEach(snapshot => {
      const data = snapshot.data() || {};
      const recordId = String(data.recordId || "").trim();
      if (!recordId || typeof data.json !== "string") return;
      const record = safeJsonParse(data.json,undefined);
      if (record !== undefined) contextualEdits[recordId] = record;
      remoteVersion = Math.max(remoteVersion,Number(data.updatedAtMs || 0));
    });

    if (hasContentDocument || Object.keys(contextualEdits).length) {
      content.contextEdits = contextualEdits;
      remote.content = content;
    }
    return {
      remote,
      remoteVersion,
      source:"structured"
    };
  }

  async function readLegacyCloudState() {
    if (!runtime.canWrite) return null;
    const {doc,getDoc} = runtime.modules.firestore;
    const snapshot = await getDoc(doc(runtime.db,"portal","main"));
    if (!snapshot.exists()) return null;

    const remote = decodeFirestoreValue(snapshot.data());
    return {
      remote,
      remoteVersion:
        remote.updatedAt?.toMillis?.()
        || Number(remote.updatedAtMs || 0),
      source:"legacy"
    };
  }

  function applyRemoteState(remote = {}) {
    const state = portal()?.state;
    if (!state) return;

    ["years","resources","commitments","citizenRequests","news"].forEach(key => {
      if (Array.isArray(remote[key])) state[key] = remote[key];
    });
    ["dashboards","settings","content","pageSettings"].forEach(key => {
      if (remote[key] && typeof remote[key] === "object") state[key] = remote[key];
    });
  }

  async function hydrateFromCloud() {
    if (!runtime.db || !portal()) return false;

    try {
      const {collection,getDocs} = runtime.modules.firestore;
      const ideasPromise = getDocs(collection(runtime.db,"ideas"));
      const structured = await readStructuredCloudState().catch(error => {
        console.warn("[Firebase] No fue posible leer el esquema estructurado.",error);
        return null;
      });
      const cloudState = structured || await readLegacyCloudState();
      const ideasSnapshot = await ideasPromise;

      if (cloudState?.remote) applyRemoteState(cloudState.remote);

      const cloudIdeas = ideasSnapshot.docs.map(item => ({
        id:item.id,
        ...decodeFirestoreValue(item.data())
      }));
      // Nunca vaciar las ideas locales cuando Firestore todavía no tiene documentos.
      // Esto evita que una colección nueva o temporalmente vacía borre el tablero existente.
      if (cloudIdeas.length) {
        portal().state.ideas = cloudIdeas;
      }

      if (!cloudState?.remote && !cloudIdeas.length) return false;

      const remoteVersion = Number(cloudState?.remoteVersion || 0);
      const localVersion = Number(localStorage.getItem("sp_v11_cloud_version") || 0);

      portal().helpers.save({localOnly:true});
      portal().applySettings();
      emit("firebase:data",{
        source:cloudState?.source || "ideas",
        remoteVersion
      });

      if (remoteVersion && remoteVersion !== localVersion) {
        localStorage.setItem("sp_v11_cloud_version",String(remoteVersion));
      }
      window.dispatchEvent(new CustomEvent("portal:datachange",{detail:{source:"firebase",remoteVersion}}));
      window.dispatchEvent(new CustomEvent("portal:rendered",{detail:{source:"firebase",remoteVersion}}));
      return true;
    } catch (error) {
      runtime.lastError = error;
      console.warn("[Firebase] Lectura pública no disponible.",error);
      return false;
    }
  }

  function queueSync() {
    if (!runtime.canWrite) return;
    clearTimeout(runtime.syncTimer);
    runtime.syncTimer = setTimeout(() => {
      pushAll().catch(error => {
        runtime.lastError = error;
        portal()?.helpers.toast(friendlyError(error));
      });
    },800);
  }

  async function commitInChunks(operations, chunkSize = 350) {
    const {writeBatch} = runtime.modules.firestore;
    for (let index = 0; index < operations.length; index += chunkSize) {
      const batch = writeBatch(runtime.db);
      operations.slice(index,index + chunkSize).forEach(operation => operation(batch));
      await batch.commit();
    }
  }

  async function pushAll(options = {}) {
    if (!runtime.ready) await init();
    if (!runtime.canWrite || !runtime.user) {
      throw Object.assign(
        new Error("La cuenta no tiene permisos de edición."),
        {code:"permission-denied"}
      );
    }
    if (runtime.syncing) return;

    runtime.syncing = true;
    emit("firebase:sync",{status:"saving"});

    try {
      const {
        doc,collection,getDocs,serverTimestamp,addDoc
      } = runtime.modules.firestore;
      const updatedAtMs = Date.now();
      const {sections,contextEdits} = prepareCloudState();
      const publicSections = preparePublicSections(sections);
      const sectionOperations = [];

      Object.entries(sections).forEach(([key,value]) => {
        const serialized = serializeCloudDocument(value,key);
        sectionOperations.push(batch => batch.set(
          doc(runtime.db,CLOUD_STATE_COLLECTION,key),
          {
            schemaVersion:CLOUD_SCHEMA_VERSION,
            key,
            json:serialized.json,
            bytes:serialized.bytes,
            updatedAt:serverTimestamp(),
            updatedAtMs,
            updatedBy:runtime.user.uid,
            updatedByEmail:runtime.user.email || ""
          },
          {merge:false}
        ));
      });

      Object.entries(publicSections).forEach(([key,value]) => {
        const serialized = serializeCloudDocument(value,`público ${key}`);
        sectionOperations.push(batch => batch.set(
          doc(runtime.db,CLOUD_PUBLIC_COLLECTION,key),
          {
            schemaVersion:CLOUD_SCHEMA_VERSION,
            key,
            json:serialized.json,
            bytes:serialized.bytes,
            updatedAt:serverTimestamp(),
            updatedAtMs,
            updatedBy:runtime.user.uid
          },
          {merge:false}
        ));
      });

      sectionOperations.push(batch => batch.set(
        doc(runtime.db,CLOUD_STATE_COLLECTION,"meta"),
        {
          schemaVersion:CLOUD_SCHEMA_VERSION,
          source:"RENDISAMP",
          updatedAt:serverTimestamp(),
          updatedAtMs,
          version:updatedAtMs,
          updatedBy:runtime.user.uid,
          updatedByEmail:runtime.user.email || ""
        },
        {merge:true}
      ));
      sectionOperations.push(batch => batch.set(
        doc(runtime.db,CLOUD_PUBLIC_COLLECTION,"meta"),
        {schemaVersion:CLOUD_SCHEMA_VERSION,source:"RENDISAMP_PUBLIC",updatedAt:serverTimestamp(),updatedAtMs,version:updatedAtMs,updatedBy:runtime.user.uid},
        {merge:true}
      ));
      await commitInChunks(sectionOperations);

      const existingEdits = await getDocs(collection(runtime.db,CLOUD_EDITS_COLLECTION));
      const editIds = new Set(Object.keys(contextEdits));
      const editOperations = [];

      existingEdits.docs.forEach(snapshot => {
        const recordId = String(snapshot.data()?.recordId || "");
        if (!editIds.has(recordId)) {
          editOperations.push(batch => batch.delete(snapshot.ref));
        }
      });

      Object.entries(contextEdits).forEach(([recordId,record]) => {
        const serialized = serializeCloudDocument(record,`edición ${recordId}`);
        const documentId = encodeURIComponent(recordId).slice(0,1450);
        editOperations.push(batch => batch.set(
          doc(runtime.db,CLOUD_EDITS_COLLECTION,documentId),
          {
            schemaVersion:CLOUD_SCHEMA_VERSION,
            recordId,
            json:serialized.json,
            bytes:serialized.bytes,
            updatedAt:serverTimestamp(),
            updatedAtMs,
            updatedBy:runtime.user.uid
          },
          {merge:false}
        ));
      });
      if (editOperations.length) await commitInChunks(editOperations);

      const existingIdeas = await getDocs(collection(runtime.db,"ideas"));
      const currentIds = new Set(portal().state.ideas.map(item => item.id));
      const ideaOperations = [];

      // La sincronización normal solo actualiza o crea ideas. La eliminación remota
      // debe ser explícita desde el administrador para impedir pérdidas masivas por
      // una caché local vacía o una lectura incompleta.
      if (options.allowIdeaDeletion === true) {
        existingIdeas.docs.forEach(item => {
          if (!currentIds.has(item.id)) {
            ideaOperations.push(batch => batch.delete(item.ref));
          }
        });
      }

      portal().state.ideas.forEach(item => {
        const {id,...ideaData} = item;
        ideaOperations.push(batch => batch.set(
          doc(runtime.db,"ideas",id),
          {
            ...encodeFirestoreValue(ideaData),
            updatedAt:serverTimestamp()
          },
          {merge:true}
        ));
      });
      if (ideaOperations.length) await commitInChunks(ideaOperations);

      await addDoc(collection(runtime.db,"auditLogs"),{
        action:options.action || "portal_sync",
        schemaVersion:CLOUD_SCHEMA_VERSION,
        userId:runtime.user.uid,
        email:runtime.user.email || "",
        createdAt:serverTimestamp(),
        page:location.pathname
      });

      localStorage.setItem("sp_v11_cloud_version",String(updatedAtMs));
      emit("firebase:sync",{status:"saved",at:updatedAtMs});
      portal()?.helpers.toast("Cambios sincronizados con Firestore.");
    } catch (error) {
      runtime.lastError = error;
      emit("firebase:sync",{
        status:"error",
        error:friendlyError(error)
      });
      throw error;
    } finally {
      runtime.syncing = false;
    }
  }

  async function createPublicIdea(idea) {
    if (!runtime.ready) await init();

    const {doc,setDoc,serverTimestamp} = runtime.modules.firestore;
    const payload = {
      title:String(idea.title || "").slice(0,120),
      author:String(idea.author || "").slice(0,120),
      location:String(idea.location || "").slice(0,120),
      category:String(idea.category || "").slice(0,80),
      description:String(idea.description || "").slice(0,1200),
      status:"recibida",
      response:"",
      votes:0,
      created:idea.created || new Date().toLocaleDateString("es-CO"),
      createdBy:runtime.user?.uid || "",
      createdByEmail:runtime.user?.email || "",
      createdAt:serverTimestamp()
    };
    await setDoc(doc(runtime.db,"ideas",idea.id),encodeFirestoreValue(payload),{merge:false});
    return payload;
  }

  async function writeAuditLog(action, details = {}) {
    if (!runtime.ready || !runtime.canWrite || !runtime.user) return;
    const {addDoc,collection,serverTimestamp} = runtime.modules.firestore;
    await addDoc(collection(runtime.db,"auditLogs"),{
      action:String(action || "administrative_update"),
      ...details,
      userId:runtime.user.uid,
      email:runtime.user.email || "",
      page:location.pathname,
      createdAt:serverTimestamp()
    });
  }

  async function sha256(value) {
    const bytes = new TextEncoder().encode(String(value || "").trim().toLowerCase());
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2,"0")).join("");
  }

  function validateSubscription(values = {}) {
    const email = String(values.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Escriba un correo electrónico válido.");
    if (values.consent !== true) throw new Error("Debe aceptar el tratamiento de datos para registrar la suscripción.");
    return {
      email,
      consent:true,
      status:String(values.status || "active"),
      preferences:Array.isArray(values.preferences) ? values.preferences.slice(0,20) : [],
      channels:{
        email:values.channels?.email !== false,
        web:Boolean(values.channels?.web),
        internal:Boolean(values.channels?.internal)
      },
      source:String(values.source || location.pathname.split("/").pop() || "portal").slice(0,120),
      publicationIds:Array.isArray(values.publicationIds) ? values.publicationIds.slice(0,50) : []
    };
  }

  async function upsertSubscription(values = {}) {
    if (!runtime.ready) await init();
    const data = validateSubscription(values);
    const id = await sha256(data.email);
    const previousToken = String(values.unsubscribeToken || "").trim();
    const unsubscribeToken = previousToken || String(crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`);
    const {doc,setDoc,serverTimestamp} = runtime.modules.firestore;
    const reference = doc(runtime.db,"subscriptions",id);
    const payload = previousToken ? {
      email:data.email,
      emailHash:id,
      unsubscribeToken,
      consent:true,
      status:"active",
      preferences:data.preferences,
      channels:data.channels,
      source:data.source,
      updatedAt:serverTimestamp()
    } : {
      ...data,
      emailHash:id,
      unsubscribeToken,
      userId:runtime.user?.uid || "",
      createdAt:serverTimestamp(),
      updatedAt:serverTimestamp(),
      lastSentAt:null,
      lastPublicationId:"",
      deliveryCount:0
    };
    try {
      await setDoc(reference,payload,{merge:Boolean(previousToken)});
    } catch (error) {
      if (!previousToken && String(error?.code || "").includes("permission-denied")) {
        throw Object.assign(new Error("Este correo ya está suscrito. Para actualizarlo use el mismo navegador o cancele primero la suscripción."),{code:"already-exists"});
      }
      throw error;
    }
    return {id,email:data.email,unsubscribeToken,status:"active",preferences:data.preferences,channels:data.channels};
  }

  async function cancelSubscription(values = {}) {
    if (!runtime.ready) await init();
    const email = String(values.email || "").trim().toLowerCase();
    if (!email) throw new Error("Escriba el correo de la suscripción.");
    const id = await sha256(email);
    const {doc,setDoc,serverTimestamp} = runtime.modules.firestore;
    await setDoc(doc(runtime.db,"subscriptions",id),{
      emailHash:id,
      email,
      unsubscribeToken:String(values.unsubscribeToken || ""),
      status:"cancelled",
      cancelledAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    },{merge:true});
    return {id,status:"cancelled"};
  }

  async function listSubscriptions() {
    if (!runtime.ready) await init();
    if (!runtime.isSuperAdmin) throw Object.assign(new Error("Solo el superadministrador puede consultar suscripciones."),{code:"permission-denied"});
    const {collection,getDocs,query,orderBy,limit} = runtime.modules.firestore;
    const snapshot = await getDocs(query(collection(runtime.db,"subscriptions"),orderBy("updatedAt","desc"),limit(500)));
    return snapshot.docs.map(item => ({id:item.id,...item.data()}));
  }

  async function updateSubscriptionAdmin(subscriptionId, values = {}) {
    if (!runtime.ready) await init();
    if (!runtime.isSuperAdmin) throw Object.assign(new Error("Solo el superadministrador puede actualizar suscripciones."),{code:"permission-denied"});
    const id = String(subscriptionId || "").trim();
    if (!id) throw new Error("Falta el identificador de la suscripción.");
    const allowedStatus = new Set(["active","paused","cancelled"]);
    const payload = {
      status:allowedStatus.has(String(values.status || "")) ? String(values.status) : "active",
      preferences:Array.isArray(values.preferences) ? values.preferences.slice(0,20) : [],
      channels:{
        email:values.channels?.email !== false,
        web:Boolean(values.channels?.web),
        internal:Boolean(values.channels?.internal)
      },
      updatedAt:runtime.modules.firestore.serverTimestamp(),
      updatedBy:runtime.user?.uid || ""
    };
    if (payload.status === "cancelled") payload.cancelledAt = runtime.modules.firestore.serverTimestamp();
    await runtime.modules.firestore.setDoc(
      runtime.modules.firestore.doc(runtime.db,"subscriptions",id),
      payload,
      {merge:true}
    );
    await writeAuditLog("subscription_update",{subscriptionId:id,status:payload.status});
    return {id,...payload};
  }

  async function deleteSubscriptionAdmin(subscriptionId) {
    if (!runtime.ready) await init();
    if (!runtime.isSuperAdmin) throw Object.assign(new Error("Solo el superadministrador puede eliminar suscripciones."),{code:"permission-denied"});
    const id = String(subscriptionId || "").trim();
    if (!id) throw new Error("Falta el identificador de la suscripción.");
    await runtime.modules.firestore.deleteDoc(runtime.modules.firestore.doc(runtime.db,"subscriptions",id));
    await writeAuditLog("subscription_delete",{subscriptionId:id});
    return {id,deleted:true};
  }

  async function refreshRoleToken() {
    if (!runtime.user) return null;
    await runtime.modules.auth.getIdToken(runtime.user,true);
    await handleAuthState(runtime.user,{reason:"role_refresh",forceTokenRefresh:true});
    return authDetail({reason:"role_refresh"});
  }

  async function getDriveSettings() {
    if (!runtime.ready) await init();
    if (!runtime.canWrite) throw Object.assign(new Error("La cuenta no tiene permiso para consultar la configuración de Drive."),{code:"permission-denied"});
    const {doc,getDoc} = runtime.modules.firestore;
    const snapshot = await getDoc(doc(runtime.db,"portalSettings","drive"));
    return snapshot.exists() ? snapshot.data() : null;
  }

  async function saveDriveSettings(values = {}) {
    if (!runtime.ready) await init();
    if (!runtime.isAdmin && !runtime.isSuperAdmin) throw Object.assign(new Error("Solo administradores pueden modificar la estructura central de Drive."),{code:"permission-denied"});
    const {doc,setDoc,serverTimestamp} = runtime.modules.firestore;
    const payload = {
      rootFolderId:String(values.rootFolderId || ""),
      rootFolderName:String(values.rootFolderName || "Rendición de Cuentas San Pedro"),
      folderIds:values.folderIds && typeof values.folderIds === "object" ? values.folderIds : {},
      folderPaths:values.folderPaths && typeof values.folderPaths === "object" ? values.folderPaths : {},
      updatedAt:serverTimestamp(),
      updatedBy:runtime.user?.uid || ""
    };
    await setDoc(doc(runtime.db,"portalSettings","drive"),payload,{merge:true});
    return payload;
  }

  async function uploadFile(file,path,options = {}) {
    if (!runtime.ready) await init();
    if (!runtime.canWrite) {
      throw Object.assign(
        new Error("La cuenta no tiene permiso administrativo para subir archivos."),
        {code:"permission-denied"}
      );
    }
    if (!window.DrivePortal) {
      throw new Error("Google Drive todavía no se encuentra disponible.");
    }
    return window.DrivePortal.uploadFile(file,path,options);
  }

  async function uploadDataUrl(dataUrl,path,options = {}) {
    if (!runtime.ready) await init();
    if (!runtime.canWrite) {
      throw Object.assign(
        new Error("La cuenta no tiene permiso administrativo para subir imágenes."),
        {code:"permission-denied"}
      );
    }
    if (!window.DrivePortal) {
      throw new Error("Google Drive todavía no se encuentra disponible.");
    }
    return window.DrivePortal.uploadDataUrl(dataUrl,path,options);
  }

  window.addEventListener("online",async () => {
    runtime.connected = true;

    if (runtime.db && runtime.modules?.firestore?.enableNetwork) {
      await runtime.modules.firestore.enableNetwork(runtime.db).catch(error => {
        console.warn("[Firebase] No fue posible reactivar la red.",error);
      });
    }

    emit("firebase:connection",{
      connected:true,
      transport:runtime.transport || "default"
    });
    hydrateFromCloud();
  });

  window.addEventListener("offline",() => {
    runtime.connected = false;
    emit("firebase:connection",{
      connected:false,
      transport:runtime.transport || "default"
    });
  });

  window.FirebasePortal = {
    init,
    signInEmail,
    signInGoogle,
    registerEmail,
    resendVerification,
    sendPasswordReset,
    updateOwnProfile,
    signOut:signOutUser,
    hydrateFromCloud,
    pushAll,
    queueSync,
    createPublicIdea,
    upsertSubscription,
    cancelSubscription,
    listSubscriptions,
    updateSubscriptionAdmin,
    deleteSubscriptionAdmin,
    refreshRoleToken,
    uploadFile,
    uploadDataUrl,
    getDriveSettings,
    saveDriveSettings,
    listUserProfiles,
    updateUserAccess,
    normalizeRole,
    roleLabel,
    friendlyError,
    canWrite:() => runtime.canWrite,
    isSuperAdmin:() => runtime.isSuperAdmin,
    getStatus:() => ({
      ...runtime,
      roleLabel:roleLabel(runtime.role)
    })
  };
})();
