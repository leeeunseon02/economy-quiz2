// 로그인 상태에 따라 오른쪽 위에 계정 이름을 표시합니다.
const HEADER_SUPABASE_URL = "https://ixaloamlmmwwygmqxkfc.supabase.co";
const HEADER_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_oxsexRgt0avACwjuBm01bg_HEG5F1Rm";
const headerSupabase = window.quizDb || window.supabase.createClient(HEADER_SUPABASE_URL, HEADER_SUPABASE_PUBLISHABLE_KEY);
window.quizDb = headerSupabase;
const accountLink = document.getElementById("accountLink");
const headerLogoutBtn = document.getElementById("headerLogoutBtn");
// 세션 확인이 끝날 때까지 로그인/회원가입 문구가 잠깐 보이는 현상을 막습니다.
accountLink.style.visibility = "hidden";
let authEventReceived = false;

function updateAccountLink(user) {
  if (user) {
    const displayName = user.user_metadata?.display_name || (user.email ? user.email.split("@")[0] : "내 계정");
    accountLink.textContent = displayName;
    accountLink.href = "login.html";
    accountLink.title = user.email || "로그인 계정";
    headerLogoutBtn.style.display = "inline-block";
  } else {
    accountLink.textContent = "로그인 / 회원가입";
    accountLink.href = "login.html";
    accountLink.title = "로그인 / 회원가입";
    headerLogoutBtn.style.display = "none";
  }
}

headerSupabase.auth.onAuthStateChange((_event, session) => {
  authEventReceived = true;
  updateAccountLink(session?.user || null);
  accountLink.style.visibility = "visible";
});
headerSupabase.auth.getSession().then(({ data, error }) => {
  // 세션 확인 도중 인증 이벤트가 먼저 발생했다면 그 최신 상태를 유지합니다.
  if (!authEventReceived) updateAccountLink(data?.session?.user || null);
  accountLink.style.visibility = "visible";
  if (error) console.error("로그인 상태 확인 오류:", error.message);
}).catch((error) => {
  accountLink.style.visibility = "visible";
  console.error("로그인 상태 확인 오류:", error);
});
headerLogoutBtn.addEventListener("click", async () => {
  const { error } = await headerSupabase.auth.signOut();
  if (error) { alert("로그아웃에 실패했습니다: " + error.message); return; }
  updateAccountLink(null);
});
