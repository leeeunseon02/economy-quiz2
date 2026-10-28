// Supabase 공개 연결 정보입니다. Publishable key만 프런트엔드에 사용하세요.
const SUPABASE_URL = "https://ixaloamlmmwwygmqxkfc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_oxsexRgt0avACwjuBm01bg_HEG5F1Rm";

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const authPanel = document.getElementById("authPanel");
const signedInPanel = document.getElementById("signedInPanel");
const authForm = document.getElementById("authForm");
const formTitle = document.getElementById("formTitle");
const formSubtitle = document.getElementById("formSubtitle");
const submitBtn = document.getElementById("submitBtn");
const toggleBtn = document.getElementById("toggleBtn");
const message = document.getElementById("message");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
let isSignUp = false;

function showMessage(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? "#d64b4b" : "#687386";
}

function setMode(signUp) {
  isSignUp = signUp;
  formTitle.textContent = signUp ? "회원가입" : "로그인";
  formSubtitle.textContent = signUp ? "새 계정을 만들어 학습을 시작하세요." : "계정에 로그인하고 학습을 이어가세요.";
  submitBtn.textContent = signUp ? "회원가입" : "로그인";
  toggleBtn.textContent = signUp ? "로그인으로 전환" : "회원가입";
  passwordInput.autocomplete = signUp ? "new-password" : "current-password";
  showMessage("");
}

function showSignedIn(user) {
  authPanel.style.display = "none";
  signedInPanel.style.display = "block";
  document.getElementById("userEmail").textContent = user.email || "로그인 사용자";
}

async function refreshSession() {
  const { data, error } = await client.auth.getSession();
  if (error) showMessage("로그인 상태를 확인하지 못했습니다: " + error.message, true);
  if (data.session?.user) showSignedIn(data.session.user);
}

toggleBtn.addEventListener("click", () => setMode(!isSignUp));

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  submitBtn.disabled = true;
  toggleBtn.disabled = true;
  showMessage(isSignUp ? "회원가입 처리 중..." : "로그인 중...");
  try {
    if (isSignUp) {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.href.split("#")[0].split("?")[0] }
      });
      if (error) throw error;
      if (data.session) {
        showSignedIn(data.user);
      } else {
        showMessage("가입 요청이 완료됐어요. 이메일 받은편지함에서 확인 링크를 눌러 주세요.");
      }
    } else {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      showSignedIn(data.user);
    }
  } catch (error) {
    showMessage(error.message || "요청 중 오류가 발생했습니다.", true);
  } finally {
    submitBtn.disabled = false;
    toggleBtn.disabled = false;
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn.disabled = true;
  const { error } = await client.auth.signOut();
  logoutBtn.disabled = false;
  if (error) {
    document.getElementById("signedMessage").textContent = "로그아웃 오류: " + error.message;
    return;
  }
  signedInPanel.style.display = "none";
  authPanel.style.display = "block";
  setMode(false);
  document.getElementById("signedMessage").textContent = "";
  showMessage("로그아웃되었습니다.");
});

client.auth.onAuthStateChange((_event, session) => {
  if (session?.user) showSignedIn(session.user);
});

setMode(false);
refreshSession();
