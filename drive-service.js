(() => {
  const STORAGE_KEY = "sp_drive_configuration_v1";
  const ROOT_CACHE_KEY = "sp_drive_root_folder_v1";
  const GIS_URL = "https://accounts.google.com/gsi/client";
  const GAPI_URL = "https://apis.google.com/js/api.js";
  const DRIVE_API = "https://www.googleapis.com/drive/v3";
  const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
  const FOLDER_MIME = "application/vnd.google-apps.folder";

  const runtime = {
    initialized:false,
    gisReady:false,
    pickerReady:false,
    tokenClient:null,
    accessToken:"",
    expiresAt:0,
    connected:false,
    connecting:null,
    rootFolderId:"",
    rootFolderName:"",
    lastUpload:null,
    account:null
  };

  const baseConfig = window.DRIVE_CONFIG || {};
  let config = loadConfig();

  function emit(name, detail = {}) {
    window.dispatchEvent(new CustomEvent(name, {detail}));
  }

  function loadConfig() {
    let local = {};
    try {
      local = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      local = {};
    }
    return {
      clientId:"",
      apiKey:"",
      appId:"",
      rootFolderId:"",
      rootFolderName:"Rendición de Cuentas San Pedro",
      makeFilesPublic:false,
      scope:"https://www.googleapis.com/auth/drive.file",
      folderPaths:{},
      folderIds:{},
      ...baseConfig,
      ...local
    };
  }

  function saveConfig() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    if (config.rootFolderId) {
      localStorage.setItem(ROOT_CACHE_KEY, JSON.stringify({
        id:config.rootFolderId,
        name:config.rootFolderName || "Rendición de Cuentas San Pedro"
      }));
    }
  }

  let centralSaveTimer = 0;
  function scheduleCentralSave() {
    clearTimeout(centralSaveTimer);
    centralSaveTimer = window.setTimeout(async () => {
      try {
        if (!window.FirebasePortal?.saveDriveSettings || !window.FirebasePortal?.getStatus?.()?.isAdmin && !window.FirebasePortal?.getStatus?.()?.isSuperAdmin) return;
        await window.FirebasePortal.saveDriveSettings({
          rootFolderId:config.rootFolderId || runtime.rootFolderId || "",
          rootFolderName:config.rootFolderName || runtime.rootFolderName || "",
          folderIds:{...(config.folderIds || {})},
          folderPaths:{...(config.folderPaths || {})}
        });
      } catch (error) {
        console.warn("[Drive] No fue posible guardar la estructura central.",error);
      }
    },500);
  }

  async function syncCentralConfig() {
    try {
      if (!window.FirebasePortal?.getDriveSettings || !window.FirebasePortal?.canWrite?.()) return getPublicConfig();
      const central = await window.FirebasePortal.getDriveSettings();
      if (!central) return getPublicConfig();
      config = {
        ...config,
        rootFolderId:central.rootFolderId || config.rootFolderId,
        rootFolderName:central.rootFolderName || config.rootFolderName,
        folderIds:{...(config.folderIds || {}),...(central.folderIds || {})},
        folderPaths:{...(config.folderPaths || {}),...(central.folderPaths || {})}
      };
      runtime.rootFolderId = config.rootFolderId || runtime.rootFolderId;
      runtime.rootFolderName = config.rootFolderName || runtime.rootFolderName;
      saveConfig();
      emit("drive:config",{config:getPublicConfig(),source:"firestore"});
      return getPublicConfig();
    } catch (error) {
      console.warn("[Drive] Configuración central no disponible.",error);
      return getPublicConfig();
    }
  }

  function friendlyError(error) {
    const status = Number(error?.status || error?.code || 0);
    const reason = error?.reason || "";
    const messages = {
      400:"Google rechazó la solicitud. Revise la configuración OAuth.",
      401:"La autorización de Google Drive venció. Conecte nuevamente la cuenta.",
      403:"La cuenta o el proyecto no tiene permiso para usar Google Drive API.",
      404:"No se encontró la carpeta configurada o la aplicación no tiene acceso a ella.",
      429:"Google Drive está recibiendo demasiadas solicitudes. Espere un momento."
    };
    if (messages[status]) return messages[status];
    if (reason === "storageQuotaExceeded") return "La cuenta de Google Drive no tiene espacio disponible.";
    if (reason === "dailyLimitExceeded") return "Se alcanzó el límite diario de la API de Google Drive.";
    if (reason === "userRateLimitExceeded") return "Se alcanzó temporalmente el límite de solicitudes de la cuenta.";
    return error?.message || "No fue posible completar la operación con Google Drive.";
  }

  function loadScript(src, id) {
    return new Promise((resolve, reject) => {
      const existing = document.getElementById(id);
      if (existing) {
        if (existing.dataset.loaded === "true") resolve();
        else {
          existing.addEventListener("load", resolve, {once:true});
          existing.addEventListener("error", reject, {once:true});
        }
        return;
      }
      const script = document.createElement("script");
      script.id = id;
      script.src = src;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        script.dataset.loaded = "true";
        resolve();
      };
      script.onerror = () => reject(new Error(`No fue posible cargar ${src}.`));
      document.head.appendChild(script);
    });
  }

  async function init() {
    if (runtime.initialized && runtime.gisReady) return runtime;
    runtime.initialized = true;

    await loadScript(GIS_URL, "google-identity-services");
    runtime.gisReady = Boolean(window.google?.accounts?.oauth2);

    const cachedRoot = (() => {
      try { return JSON.parse(localStorage.getItem(ROOT_CACHE_KEY) || "{}"); }
      catch { return {}; }
    })();
    runtime.rootFolderId = config.rootFolderId || cachedRoot.id || "";
    runtime.rootFolderName = config.rootFolderName || cachedRoot.name || "Rendición de Cuentas San Pedro";

    initializeTokenClient();
    emit("drive:ready", {configured:isConfigured(), connected:runtime.connected});
    return runtime;
  }

  function initializeTokenClient() {
    runtime.tokenClient = null;
    if (!runtime.gisReady || !config.clientId) return;

    runtime.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id:config.clientId,
      scope:config.scope || "https://www.googleapis.com/auth/drive.file",
      callback:() => {}
    });
  }

  function isConfigured() {
    return Boolean(config.clientId);
  }

  function hasValidToken() {
    return Boolean(runtime.accessToken && Date.now() < runtime.expiresAt - 60000);
  }

  async function connect(options = {}) {
    await init();
    if (!config.clientId) {
      throw new Error("Debe configurar primero el ID de cliente OAuth de Google.");
    }
    if (hasValidToken()) return runtime;
    if (runtime.connecting) return runtime.connecting;

    runtime.connecting = new Promise((resolve, reject) => {
      runtime.tokenClient.callback = response => {
        runtime.connecting = null;
        if (response?.error) {
          const error = new Error(response.error_description || response.error);
          error.code = response.error;
          reject(error);
          return;
        }
        runtime.accessToken = response.access_token;
        runtime.expiresAt = Date.now() + Number(response.expires_in || 3600) * 1000;
        runtime.connected = true;
        emit("drive:auth", {connected:true});
        resolve(runtime);
      };

      runtime.tokenClient.error_callback = error => {
        runtime.connecting = null;
        reject(error);
      };

      runtime.tokenClient.requestAccessToken({
        prompt:options.prompt ?? (runtime.accessToken ? "" : "consent")
      });
    });

    return runtime.connecting;
  }

  async function disconnect() {
    if (runtime.accessToken && window.google?.accounts?.oauth2?.revoke) {
      await new Promise(resolve => {
        google.accounts.oauth2.revoke(runtime.accessToken, () => resolve());
      });
    }
    runtime.accessToken = "";
    runtime.expiresAt = 0;
    runtime.connected = false;
    emit("drive:auth", {connected:false});
  }

  function configure(values = {}) {
    config = {
      ...config,
      ...values,
      makeFilesPublic:values.makeFilesPublic === undefined
        ? config.makeFilesPublic
        : Boolean(values.makeFilesPublic)
    };
    saveConfig();
    initializeTokenClient();
    emit("drive:config", {config:getPublicConfig()});
    return getPublicConfig();
  }

  function getPublicConfig() {
    return {
      clientId:config.clientId || "",
      apiKey:config.apiKey || "",
      appId:config.appId || "",
      rootFolderId:config.rootFolderId || runtime.rootFolderId || "",
      rootFolderName:config.rootFolderName || runtime.rootFolderName || "",
      makeFilesPublic:config.makeFilesPublic === true,
      scope:config.scope,
      folderPaths:{...(config.folderPaths || {})},
      folderIds:{...(config.folderIds || {})}
    };
  }

  async function authorizedFetch(url, options = {}) {
    if (!hasValidToken()) await connect();
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${runtime.accessToken}`);
    const response = await fetch(url, {...options, headers});

    if (!response.ok) {
      let payload = {};
      try { payload = await response.json(); } catch {}
      const error = new Error(
        payload?.error?.message
        || `Google Drive respondió con estado ${response.status}.`
      );
      error.status = response.status;
      error.reason = payload?.error?.errors?.[0]?.reason || "";
      if (response.status === 401) {
        runtime.accessToken = "";
        runtime.expiresAt = 0;
        runtime.connected = false;
      }
      throw error;
    }
    return response;
  }

  function escapeQuery(value) {
    return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  }

  async function getFile(fileId, fields = "id,name,mimeType,parents,webViewLink,webContentLink,thumbnailLink,size,createdTime") {
    const query = new URLSearchParams({
      fields,
      supportsAllDrives:"true"
    });
    const response = await authorizedFetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?${query}`);
    return response.json();
  }

  async function findFolder(name, parentId = "") {
    const clauses = [
      `mimeType='${FOLDER_MIME}'`,
      "trashed=false",
      `name='${escapeQuery(name)}'`
    ];
    if (parentId) clauses.push(`'${escapeQuery(parentId)}' in parents`);

    const params = new URLSearchParams({
      q:clauses.join(" and "),
      fields:"files(id,name,parents,driveId)",
      spaces:"drive",
      pageSize:"20",
      corpora:"user",
      includeItemsFromAllDrives:"true",
      supportsAllDrives:"true"
    });
    const response = await authorizedFetch(`${DRIVE_API}/files?${params}`);
    const data = await response.json();
    return data.files?.[0] || null;
  }

  async function createFolder(name, parentId = "") {
    const metadata = {
      name,
      mimeType:FOLDER_MIME,
      appProperties:{
        portal:"rendicion-san-pedro",
        managedBy:"portal-web"
      }
    };
    if (parentId) metadata.parents = [parentId];

    const params = new URLSearchParams({
      fields:"id,name,parents,webViewLink,driveId",
      supportsAllDrives:"true"
    });
    const response = await authorizedFetch(`${DRIVE_API}/files?${params}`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(metadata)
    });
    return response.json();
  }

  async function ensureRootFolder(options = {}) {
    await connect();

    const requestedId = options.forceNew ? "" : (
      config.rootFolderId || runtime.rootFolderId
    );

    if (requestedId) {
      try {
        const folder = await getFile(requestedId, "id,name,mimeType,webViewLink,driveId");
        if (folder.mimeType !== FOLDER_MIME) {
          throw new Error("El ID configurado no corresponde a una carpeta de Google Drive.");
        }
        runtime.rootFolderId = folder.id;
        runtime.rootFolderName = folder.name;
        config.rootFolderId = folder.id;
        config.rootFolderName = folder.name;
        saveConfig();
        scheduleCentralSave();
        emit("drive:folder", {folder});
        return folder;
      } catch (error) {
        if (!options.fallbackCreate) throw error;
      }
    }

    const name = config.rootFolderName || "Rendición de Cuentas San Pedro";
    let folder = await findFolder(name);
    if (!folder || options.forceNew) folder = await createFolder(name);

    runtime.rootFolderId = folder.id;
    runtime.rootFolderName = folder.name;
    config.rootFolderId = folder.id;
    config.rootFolderName = folder.name;
    saveConfig();
    scheduleCentralSave();
    emit("drive:folder", {folder});
    return folder;
  }

  function normalizeFolderSegment(segment) {
    const replacements = {
      "public":"Portal público",
      "images":"Imágenes",
      "documents":"Documentos",
      "branding":"Identidad visual",
      "crest":"Escudo",
      "brand":"Marca",
      "banners":"Banners",
      "entities":"Contenido",
      "resources":"Recursos",
      "commitments":"Compromisos",
      "evidence":"Evidencias",
      "documents":"Documentos",
      "new":"Nuevos recursos"
    };
    const clean = String(segment || "").trim();
    if (!clean) return "";
    return replacements[clean.toLowerCase()]
      || clean.replace(/[-_]+/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function modulePath(key, fallback = "Documentos") {
    const paths = config.folderPaths || baseConfig.folderPaths || {};
    return paths[key] || fallback;
  }

  async function ensureModuleFolder(key, options = {}) {
    return ensureFolderPath(modulePath(key, key), options);
  }

  async function ensureFolderPath(path, options = {}) {
    const root = await ensureRootFolder({fallbackCreate:true});
    const segments = [];
    if (options.year) segments.push(String(options.year));
    String(path || "").split("/").map(normalizeFolderSegment).filter(Boolean).forEach(segment => {
      if (!segments.includes(segment)) segments.push(segment);
    });
    const cacheKey = [options.year || "",...segments].filter(Boolean).join("/");
    const cachedId = config.folderIds?.[cacheKey];
    if (cachedId) {
      try {
        const cached = await getFile(cachedId,"id,name,mimeType,parents,webViewLink");
        if (cached.mimeType === FOLDER_MIME) return cached;
      } catch (_) { delete config.folderIds[cacheKey]; }
    }
    let parentId = root.id;
    let lastFolder = root;
    const walked = [];
    for (const segment of segments) {
      walked.push(segment);
      const partialKey = [options.year || "",...walked].filter(Boolean).join("/");
      const partialId = config.folderIds?.[partialKey];
      let folder = null;
      if (partialId) {
        try { folder = await getFile(partialId,"id,name,mimeType,parents,webViewLink"); } catch (_) {}
      }
      if (!folder) folder = await findFolder(segment, parentId);
      if (!folder) folder = await createFolder(segment, parentId);
      config.folderIds = {...(config.folderIds || {}),[partialKey]:folder.id};
      parentId = folder.id;
      lastFolder = folder;
    }
    saveConfig();
    scheduleCentralSave();
    return lastFolder;
  }

  async function createPublicPermission(fileId) {
    const params = new URLSearchParams({
      supportsAllDrives:"true",
      fields:"id,type,role,allowFileDiscovery"
    });
    const response = await authorizedFetch(
      `${DRIVE_API}/files/${encodeURIComponent(fileId)}/permissions?${params}`,
      {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          type:"anyone",
          role:"reader",
          allowFileDiscovery:false
        })
      }
    );
    return response.json();
  }

  function fileLinks(file) {
    const id = file.id;
    const isImage = String(file.mimeType || "").startsWith("image/");
    return {
      id,
      name:file.name,
      mimeType:file.mimeType,
      size:Number(file.size || 0),
      webViewLink:file.webViewLink || `https://drive.google.com/file/d/${id}/view`,
      webContentLink:file.webContentLink || `https://drive.usercontent.google.com/download?id=${id}&export=download`,
      displayUrl:isImage
        ? `https://drive.google.com/thumbnail?id=${id}&sz=w2000`
        : (file.webViewLink || `https://drive.google.com/file/d/${id}/view`),
      thumbnailUrl:file.thumbnailLink || (isImage ? `https://drive.google.com/thumbnail?id=${id}&sz=w1000` : ""),
      folderId:file.parents?.[0] || "",
      createdTime:file.createdTime || "",
      driveFileId:id,
      driveFolderId:file.parents?.[0] || "",
      uploadedAt:file.createdTime || new Date().toISOString(),
      uploadedBy:window.FirebasePortal?.getStatus?.()?.user?.uid || "",
      visibility:"private"
    };
  }

  function resumableUpload(uploadUrl, file) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

      xhr.upload.addEventListener("progress", event => {
        if (!event.lengthComputable) return;
        const progress = Math.round((event.loaded / event.total) * 100);
        emit("drive:upload", {
          status:"uploading",
          progress,
          loaded:event.loaded,
          total:event.total,
          name:file.name
        });
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(xhr.responseText ? JSON.parse(xhr.responseText) : {});
          } catch {
            resolve({});
          }
        } else {
          const error = new Error(`La carga a Drive falló con estado ${xhr.status}.`);
          error.status = xhr.status;
          reject(error);
        }
      });
      xhr.addEventListener("error", () => reject(new Error("Se perdió la conexión durante la carga.")));
      xhr.addEventListener("abort", () => reject(new Error("La carga fue cancelada.")));
      xhr.send(file);
    });
  }

  async function uploadFile(file, path = "Documentos", options = {}) {
    if (!file) throw new Error("Seleccione un archivo.");
    await connect();

    const folder = await ensureFolderPath(path, options);
    const safeName = String(file.name || "archivo")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "-")
      .trim();

    const metadata = {
      name:safeName || `archivo-${Date.now()}`,
      mimeType:file.type || "application/octet-stream",
      parents:[folder.id],
      description:options.description || "Archivo cargado desde el portal de Rendición de Cuentas de San Pedro.",
      appProperties:{
        portal:"rendicion-san-pedro",
        category:String(options.category || path || "documento").slice(0,120),
        year:String(options.year || ""),
        uploadedFrom:location.hostname
      }
    };

    emit("drive:upload", {status:"preparing", progress:0, name:file.name});

    const params = new URLSearchParams({
      uploadType:"resumable",
      supportsAllDrives:"true",
      fields:"id,name,mimeType,parents,webViewLink,webContentLink,thumbnailLink,size,createdTime"
    });
    const initResponse = await authorizedFetch(`${DRIVE_UPLOAD_API}/files?${params}`, {
      method:"POST",
      headers:{
        "Content-Type":"application/json; charset=UTF-8",
        "X-Upload-Content-Type":file.type || "application/octet-stream",
        "X-Upload-Content-Length":String(file.size)
      },
      body:JSON.stringify(metadata)
    });

    const uploadUrl = initResponse.headers.get("Location");
    if (!uploadUrl) throw new Error("Google Drive no devolvió una sesión de carga.");

    let uploaded = await resumableUpload(uploadUrl, file);
    if (!uploaded.id) {
      throw new Error("Google Drive no confirmó el archivo cargado.");
    }

    if (options.makePublic === true) {
      try {
        await createPublicPermission(uploaded.id);
      } catch (error) {
        emit("drive:warning", {
          message:"El archivo se cargó, pero la organización no permitió compartirlo públicamente.",
          error:friendlyError(error)
        });
      }
    }

    uploaded = await getFile(uploaded.id);
    const links = fileLinks(uploaded);
    runtime.lastUpload = links;

    emit("drive:upload", {
      status:"complete",
      progress:100,
      name:file.name,
      file:links
    });
    return options.returnMetadata ? links : (
      String(file.type || "").startsWith("image/") ? links.displayUrl : links.webViewLink
    );
  }

  async function uploadDataUrl(dataUrl, path = "Imágenes", options = {}) {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const extension = blob.type.includes("png")
      ? "png"
      : blob.type.includes("webp")
        ? "webp"
        : "jpg";
    const file = new File(
      [blob],
      options.fileName || `imagen-${Date.now()}.${extension}`,
      {type:blob.type || "image/jpeg"}
    );
    return uploadFile(file, path, {
      ...options,
      category:options.category || "imagen",
      makePublic:options.makePublic !== false
    });
  }

  async function testConnection() {
    await connect();
    const params = new URLSearchParams({
      fields:"user(displayName,emailAddress,photoLink),storageQuota(limit,usage,usageInDrive)"
    });
    const response = await authorizedFetch(`${DRIVE_API}/about?${params}`);
    const data = await response.json();
    runtime.account = data.user || null;
    emit("drive:account", {account:runtime.account, storageQuota:data.storageQuota || {}});
    return data;
  }

  async function loadPicker() {
    if (runtime.pickerReady && window.google?.picker) return;
    await loadScript(GAPI_URL, "google-api-loader");
    await new Promise((resolve, reject) => {
      if (!window.gapi?.load) {
        reject(new Error("Google Picker no se pudo cargar."));
        return;
      }
      gapi.load("picker", {
        callback:resolve,
        onerror:() => reject(new Error("Google Picker no se pudo inicializar."))
      });
    });
    runtime.pickerReady = Boolean(window.google?.picker);
  }

  async function chooseFolder() {
    await connect();
    if (!config.apiKey) {
      throw new Error("Debe configurar una API key para abrir Google Picker.");
    }
    await loadPicker();

    return new Promise((resolve, reject) => {
      const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS);
      view.setIncludeFolders(true);
      if (typeof view.setSelectFolderEnabled === "function") {
        view.setSelectFolderEnabled(true);
      }
      if (typeof view.setMimeTypes === "function") {
        view.setMimeTypes(FOLDER_MIME);
      }

      const builder = new google.picker.PickerBuilder()
        .addView(view)
        .enableFeature(google.picker.Feature.SUPPORT_DRIVES)
        .setOAuthToken(runtime.accessToken)
        .setDeveloperKey(config.apiKey)
        .setCallback(data => {
          const action = data[google.picker.Response.ACTION];
          if (action === google.picker.Action.PICKED) {
            const document = data[google.picker.Response.DOCUMENTS]?.[0];
            const folder = {
              id:document?.[google.picker.Document.ID],
              name:document?.[google.picker.Document.NAME] || "Carpeta seleccionada",
              url:document?.[google.picker.Document.URL] || ""
            };
            if (!folder.id) {
              reject(new Error("Google Picker no devolvió el ID de la carpeta."));
              return;
            }
            runtime.rootFolderId = folder.id;
            runtime.rootFolderName = folder.name;
            config.rootFolderId = folder.id;
            config.rootFolderName = folder.name;
            saveConfig();
            scheduleCentralSave();
            emit("drive:folder", {folder});
            resolve(folder);
          }
          if (action === google.picker.Action.CANCEL) resolve(null);
        });

      if (config.appId) builder.setAppId(config.appId);
      if (typeof builder.setOrigin === "function") builder.setOrigin(location.origin);

      builder.build().setVisible(true);
    });
  }

  async function chooseFiles(options = {}) {
    await connect();
    if (!config.apiKey) throw new Error("Debe configurar una API key para abrir Google Picker.");
    await loadPicker();

    const mimeTypes = Array.isArray(options.mimeTypes)
      ? options.mimeTypes.filter(Boolean).join(",")
      : String(options.mimeTypes || "").trim();

    return new Promise((resolve, reject) => {
      const view = new google.picker.DocsView(google.picker.ViewId.DOCS);
      view.setIncludeFolders(false);
      if (mimeTypes && typeof view.setMimeTypes === "function") view.setMimeTypes(mimeTypes);

      const builder = new google.picker.PickerBuilder()
        .addView(view)
        .enableFeature(google.picker.Feature.SUPPORT_DRIVES)
        .setOAuthToken(runtime.accessToken)
        .setDeveloperKey(config.apiKey)
        .setCallback(async data => {
          const action = data[google.picker.Response.ACTION];
          if (action === google.picker.Action.CANCEL) return resolve([]);
          if (action !== google.picker.Action.PICKED) return;
          try {
            const docs = data[google.picker.Response.DOCUMENTS] || [];
            const selected = [];
            for (const document of docs) {
              const id = document?.[google.picker.Document.ID];
              if (!id) continue;
              selected.push(fileLinks(await getFile(id)));
            }
            resolve(selected);
          } catch (error) { reject(error); }
        });
      if (options.multiple) builder.enableFeature(google.picker.Feature.MULTISELECT_ENABLED);
      if (config.appId) builder.setAppId(config.appId);
      if (typeof builder.setOrigin === "function") builder.setOrigin(location.origin);
      builder.build().setVisible(true);
    });
  }

  async function setPublicVisibility(fileId, makePublic) {
    if (!fileId) throw new Error("Falta el ID del archivo de Drive.");
    await connect();
    const list = await authorizedFetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}/permissions?fields=permissions(id,type,role)&supportsAllDrives=true`)
      .then(response => response.json());
    const anyone = (list.permissions || []).find(permission => permission.type === "anyone");
    if (makePublic && !anyone) await createPublicPermission(fileId);
    if (!makePublic && anyone) {
      await authorizedFetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}/permissions/${encodeURIComponent(anyone.id)}?supportsAllDrives=true`, {method:"DELETE"});
    }
    return {...fileLinks(await getFile(fileId)), visibility:makePublic ? "public" : "private"};
  }

  async function deleteFile(fileId) {
    if (!fileId) return false;
    await authorizedFetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`, {method:"DELETE"});
    emit("drive:filedeleted", {fileId});
    return true;
  }

  function normalizeReference(file, extra = {}) {
    if (!file) return null;
    const ref = file.driveFileId ? file : fileLinks(file);
    return {
      driveFileId:ref.driveFileId || ref.id || "",
      driveFolderId:ref.driveFolderId || ref.folderId || "",
      name:ref.name || "",
      mimeType:ref.mimeType || "application/octet-stream",
      size:Number(ref.size || 0),
      thumbnailUrl:ref.thumbnailUrl || "",
      displayUrl:ref.displayUrl || "",
      webViewLink:ref.webViewLink || "",
      webContentLink:ref.webContentLink || "",
      uploadedAt:ref.uploadedAt || ref.createdTime || new Date().toISOString(),
      uploadedBy:ref.uploadedBy || window.FirebasePortal?.getStatus?.()?.user?.uid || "",
      visibility:extra.visibility || ref.visibility || "private",
      module:extra.module || ""
    };
  }

  async function createNewRootFolder() {
    config.rootFolderId = "";
    runtime.rootFolderId = "";
    localStorage.removeItem(ROOT_CACHE_KEY);
    saveConfig();
    return ensureRootFolder({forceNew:true, fallbackCreate:true});
  }

  function openRootFolder() {
    const id = config.rootFolderId || runtime.rootFolderId;
    if (!id) throw new Error("Todavía no hay una carpeta de Drive configurada.");
    window.open(`https://drive.google.com/drive/folders/${id}`, "_blank", "noopener");
  }

  function getStatus() {
    return {
      initialized:runtime.initialized,
      configured:isConfigured(),
      connected:runtime.connected && hasValidToken(),
      expiresAt:runtime.expiresAt,
      rootFolderId:config.rootFolderId || runtime.rootFolderId || "",
      rootFolderName:config.rootFolderName || runtime.rootFolderName || "",
      account:runtime.account,
      lastUpload:runtime.lastUpload,
      config:getPublicConfig()
    };
  }

  window.DrivePortal = {
    init,
    configure,
    connect,
    disconnect,
    testConnection,
    chooseFolder,
    chooseFiles,
    ensureRootFolder,
    ensureFolderPath,
    ensureModuleFolder,
    modulePath,
    createNewRootFolder,
    openRootFolder,
    uploadFile,
    uploadDataUrl,
    setPublicVisibility,
    deleteFile,
    getFile,
    normalizeReference,
    friendlyError,
    isConfigured,
    getConfig:getPublicConfig,
    getStatus,
    syncCentralConfig
  };

  ["firebase:auth","firebase:data"].forEach(eventName => window.addEventListener(eventName,() => syncCentralConfig()));

  init().then(() => syncCentralConfig()).catch(error => {
    console.warn("[Drive] No fue posible inicializar.", error);
    emit("drive:ready", {configured:isConfigured(), connected:false, error:friendlyError(error)});
  });
})();
