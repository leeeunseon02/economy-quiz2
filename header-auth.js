// 로그인 상태에 따라 오른쪽 위에 계정 이름을 표시합니다.
const HEADER_SUPABASE_URL = "https://ixaloamlmmwwygmqxkfc.supabase.co";
const HEADER_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_oxsexRgt0avACwjuBm01bg_HEG5F1Rm";
const headerSupabase = window.supabase.createClient(HEADER_SUPABASE_URL, HEADER_SUPABASE_PUBLISHABLE_KEY);
const accountLink = document.getElementById("accountLink");
const headerLogoutBtn = document.getElementById("headerLogoutBtn");

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

headerSupabase.auth.getSession().then(({ data }) => updateAccountLink(data.session?.user || null));
headerSupabase.auth.onAuthStateChange((_event, session) => updateAccountLink(session?.user || null));
headerLogoutBtn.addEventListener("click", async () => {
  const { error } = await headerSupabase.auth.signOut();
  if (error) { alert("로그아웃에 실패했습니다: " + error.message); return; }
  updateAccountLink(null);
});
