import { firebaseConfig } from "../../assets/firebase-config.js";
import { validateEntry } from "../../assets/shared.js";
export const configured = !!(
  firebaseConfig?.apiKey &&
  firebaseConfig?.projectId &&
  firebaseConfig?.authDomain &&
  firebaseConfig?.appId
);
let singleton;
export async function initializeCloud(onUser) {
  if (!configured)
    throw Error(
      "Firebase 프로젝트 설정이 아직 연결되지 않았어요. 이 기기에 저장 모드는 사용할 수 있어요.",
    );
  if (!singleton)
    singleton = (async () => {
      const [app, authSDK, fs] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js"),
        import(
          "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js"
        ),
      ]);
      const instance = app.initializeApp(firebaseConfig),
        auth = authSDK.getAuth(instance),
        db = fs.initializeFirestore(instance, {
          localCache: fs.memoryLocalCache(),
        });
      await authSDK.setPersistence(auth, authSDK.browserSessionPersistence);
      return { auth, authSDK, db, fs };
    })();
  let services;
  try {
    services = await singleton;
  } catch (error) {
    singleton = null;
    throw error;
  }
  await services.auth.authStateReady();
  const unsubscribe = services.authSDK.onAuthStateChanged(
    services.auth,
    onUser,
  );
  return {
    unsubscribe,
    allowed: async () => {
      const user = services.auth.currentUser;
      if (!user || !user.emailVerified) return false;
      const owner = await services.fs.getDocFromServer(
        services.fs.doc(services.db, 'privateAccess', 'owner')
      );
      return services.auth.currentUser?.uid === user.uid && owner.exists() && owner.data().uid === user.uid;
    },
    user: () => services.auth.currentUser,
    login: async () => {
      const provider = new services.authSDK.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await services.authSDK.signInWithPopup(services.auth, provider);
    },
    logout: () => services.authSDK.signOut(services.auth),
    store: () => cloudStore(services),
  };
}
function cloudStore({ auth, db, fs }) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw Error("먼저 Google 계정으로 로그인해 주세요.");
  let cursor = null;
  const own = () => {
    if (auth.currentUser?.uid !== uid)
      throw Error("계정이 변경됐어요. 다시 로그인해 주세요.");
  };
  const collection = fs.collection(db, "users", uid, "entries");
  const mapDoc = (d) => {
    const v = d.data();
    return {
      ...validateEntry(v),
      id: d.id,
      updated_at: v.updatedAt?.toDate().toISOString() || "",
    };
  };
  return {
    kind: "cloud",
    async list(more = false) {
      own();
      const clauses = [fs.orderBy("date", "desc"), fs.limit(200)];
      if (more && cursor) clauses.push(fs.startAfter(cursor));
      const result = await fs.getDocsFromServer(
        fs.query(collection, ...clauses),
      );
      own();
      cursor = result.docs.at(-1) || null;
      return { entries: result.docs.map(mapDoc), hasMore: result.size === 200 };
    },
    async save(value, id) {
      own();
      const data = validateEntry(value);
      if (id && id !== data.date)
        throw Error("기존 일기의 날짜는 변경할 수 없어요.");
      const ref = fs.doc(collection, data.date);
      await fs.runTransaction(db, async (tx) => {
        const current = await tx.get(ref);
        if (!id && current.exists())
          throw Error("이 날짜의 일기가 이미 있어요.");
        if (id && !current.exists()) throw Error("일기를 찾을 수 없어요.");
        tx.set(ref, {
          ...data,
          createdAt: current.exists()
            ? current.data().createdAt
            : fs.serverTimestamp(),
          updatedAt: fs.serverTimestamp(),
        });
      });
      own();
      return { ...data, id: data.date, updated_at: new Date().toISOString() };
    },
    async remove(id) {
      own();
      await fs.deleteDoc(fs.doc(collection, id));
      own();
    },
  };
}
