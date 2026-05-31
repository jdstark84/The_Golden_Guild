const STORAGE_KEY = "goldenGuildState";
const USERNAME_EMAIL_DOMAIN = "goldenguild.local";

const seedState = {
  currentUser: null,
  users: [
    {
      username: "Mira",
      password: "guild",
      joinedAt: "2026-04-24T18:30:00.000Z",
    },
    {
      username: "Jonah",
      password: "guild",
      joinedAt: "2026-04-25T15:20:00.000Z",
    },
  ],
  posts: [
    {
      id: crypto.randomUUID(),
      title: "On Keeping Tiny Promises",
      body: "I keep thinking about how friendships are built less from grand gestures than from little remembered things: the book someone meant to read, the soup they like, the Tuesday they said would be hard. The tiny promise is a lantern. It does not light the whole road, but it lights enough.",
      author: "Mira",
      imageUrl: "",
      imagePath: "",
      createdAt: "2026-05-01T17:20:00.000Z",
    },
    {
      id: crypto.randomUUID(),
      title: "Notes From a Long Walk",
      body: "The city changes when you refuse to hurry through it. Every block becomes a paragraph. Every window has its own grammar. I walked home the long way and arrived with nothing solved, which was somehow exactly the point.",
      author: "Jonah",
      imageUrl: "",
      imagePath: "",
      createdAt: "2026-05-04T21:12:00.000Z",
    },
  ],
  comments: [],
};

const supabaseSettings = window.GOLDEN_GUILD_SUPABASE ?? {};
const hasSupabaseConfig = Boolean(supabaseSettings.url && supabaseSettings.anonKey && window.supabase);
const db = hasSupabaseConfig
  ? window.supabase.createClient(supabaseSettings.url, supabaseSettings.anonKey)
  : null;

let state = loadState();
let authMode = "login";
let isLoading = false;

const accountArea = document.querySelector("#accountArea");
const authDialog = document.querySelector("#authDialog");
const authForm = document.querySelector("#authForm");
const authTitle = document.querySelector("#authTitle");
const authMessage = document.querySelector("#authMessage");
const usernameInput = document.querySelector("#usernameInput");
const passwordInput = document.querySelector("#passwordInput");
const postForm = document.querySelector("#postForm");
const postGrid = document.querySelector("#postGrid");
const postTemplate = document.querySelector("#postTemplate");
const searchInput = document.querySelector("#searchInput");
const sortSelect = document.querySelector("#sortSelect");
const emptyState = document.querySelector("#emptyState");
const memberList = document.querySelector("#memberList");
const editorHint = document.querySelector("#editorHint");
const imageInput = document.querySelector("#imageInput");

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(seedState);

  try {
    const parsed = JSON.parse(saved);
    return {
      currentUser: parsed.currentUser ?? null,
      currentUserId: parsed.currentUserId ?? null,
      users: parsed.users?.length ? parsed.users : seedState.users,
      posts: parsed.posts?.length ? parsed.posts : seedState.posts,
      comments: parsed.comments ?? [],
    };
  } catch {
    return structuredClone(seedState);
  }
}

function saveState() {
  if (!hasSupabaseConfig) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

async function initializeApp() {
  if (hasSupabaseConfig) {
    await loadSupabaseState();
    db.auth.onAuthStateChange(() => {
      loadSupabaseState();
    });
  }

  wireEvents();
  render();
}

async function loadSupabaseState() {
  isLoading = true;
  render();

  const { data: sessionData } = await db.auth.getSession();
  const userId = sessionData.session?.user?.id ?? null;
  let currentUsername = null;

  if (userId) {
    const { data: profile } = await db
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .maybeSingle();
    currentUsername = profile?.username ?? null;
  }

  const [
    { data: profiles, error: profilesError },
    { data: posts, error: postsError },
    { data: comments, error: commentsError },
  ] =
    await Promise.all([
      db.from("profiles").select("id, username, created_at").order("username"),
      db
        .from("posts")
        .select("id, title, body, image_url, image_path, created_at, profiles(username)")
        .order("created_at", { ascending: false }),
      db
        .from("comments")
        .select("id, post_id, body, created_at, profiles(username)")
        .order("created_at", { ascending: true }),
    ]);

  if (profilesError || postsError || commentsError) {
    authMessage.textContent = "Supabase is connected, but the database tables are not ready yet.";
    isLoading = false;
    render();
    return;
  }

  state = {
    currentUser: currentUsername,
    currentUserId: userId,
    users: (profiles ?? []).map((profile) => ({
      id: profile.id,
      username: profile.username,
      joinedAt: profile.created_at,
    })),
    posts: (posts ?? []).map((post) => ({
      id: post.id,
      title: post.title,
      body: post.body,
      author: post.profiles?.username ?? "Unknown",
      imageUrl: post.image_url ?? "",
      imagePath: post.image_path ?? "",
      createdAt: post.created_at,
    })),
    comments: (comments ?? []).map((comment) => ({
      id: comment.id,
      postId: comment.post_id,
      body: comment.body,
      author: comment.profiles?.username ?? "Unknown",
      createdAt: comment.created_at,
    })),
  };

  isLoading = false;
  render();
}

function setView(viewName) {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === `${viewName}View`);
  });
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
}

function openAuth(mode = "login") {
  authMode = mode;
  updateAuthMode();
  authMessage.textContent = hasSupabaseConfig
    ? "Use a username and password. No email address needed."
    : "Prototype mode: this account only saves in this browser.";
  authForm.reset();
  authDialog.showModal();
  usernameInput.focus();
}

function updateAuthMode() {
  authTitle.textContent = authMode === "login" ? "Sign in" : "Create account";
  passwordInput.autocomplete = authMode === "login" ? "current-password" : "new-password";
  document.querySelectorAll(".segment").forEach((button) => {
    button.classList.toggle("active", button.dataset.authMode === authMode);
  });
}

function getUser(username) {
  return state.users.find((user) => user.username.toLowerCase() === username.toLowerCase());
}

function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@${USERNAME_EMAIL_DOMAIN}`;
}

function initials(username) {
  return username.trim().slice(0, 1).toUpperCase();
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

function renderAccount() {
  accountArea.replaceChildren();

  if (isLoading) {
    const loading = document.createElement("span");
    loading.className = "user-pill";
    loading.textContent = "Opening ledger...";
    accountArea.append(loading);
    return;
  }

  if (state.currentUser) {
    const pill = document.createElement("span");
    pill.className = "user-pill";
    const avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.textContent = initials(state.currentUser);
    const username = document.createElement("span");
    username.textContent = state.currentUser;
    pill.append(avatar, username);

    const logout = document.createElement("button");
    logout.className = "secondary-action";
    logout.type = "button";
    logout.textContent = "Log out";
    logout.addEventListener("click", handleLogout);

    accountArea.append(pill, logout);
    return;
  }

  const login = document.createElement("button");
  login.className = "secondary-action";
  login.type = "button";
  login.textContent = "Log in";
  login.addEventListener("click", () => openAuth("login"));

  const signup = document.createElement("button");
  signup.className = "primary-action";
  signup.type = "button";
  signup.textContent = "Join";
  signup.addEventListener("click", () => openAuth("signup"));

  accountArea.append(login, signup);
}

function filteredPosts() {
  const query = searchInput.value.trim().toLowerCase();
  const posts = state.posts.filter((post) => {
    const searchable = `${post.title} ${post.body} ${post.author}`.toLowerCase();
    return searchable.includes(query);
  });

  return posts.sort((a, b) => {
    if (sortSelect.value === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortSelect.value === "author") return a.author.localeCompare(b.author);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

function renderPosts() {
  const posts = filteredPosts();
  postGrid.replaceChildren();

  posts.forEach((post) => {
    const node = postTemplate.content.cloneNode(true);
    const card = node.querySelector(".post-card");
    const avatar = node.querySelector(".avatar");
    const author = node.querySelector(".author");
    const time = node.querySelector("time");
    const title = node.querySelector("h3");
    const body = node.querySelector("p");
    const readButton = node.querySelector("button");

    avatar.textContent = initials(post.author);
    author.textContent = post.author;
    time.textContent = formatDate(post.createdAt);
    time.dateTime = post.createdAt;
    title.textContent = post.title;
    body.textContent = post.body;
    if (post.imageUrl) {
      const figure = document.createElement("figure");
      figure.className = "post-artwork";
      const image = document.createElement("img");
      image.src = post.imageUrl;
      image.alt = `Artwork attached to ${post.title}`;
      figure.append(image);
      body.after(figure);
    }
    readButton.addEventListener("click", () => showFullPost(post));
    card.style.borderTop = `4px solid ${authorColor(post.author)}`;
    postGrid.append(node);
  });

  emptyState.classList.toggle("hidden", posts.length > 0 || isLoading);
  document.querySelector("#postCount").textContent = state.posts.length;
}

function showFullPost(post) {
  const comments = commentsForPost(post.id);
  const wrapper = document.createElement("div");
  wrapper.className = "full-post";
  wrapper.innerHTML = `
    <div class="post-meta">
      <span class="avatar">${initials(post.author)}</span>
      <span>${escapeHtml(post.author)}</span>
      <time datetime="${post.createdAt}">${formatDate(post.createdAt)}</time>
    </div>
    <h2>${escapeHtml(post.title)}</h2>
    ${post.imageUrl ? `<figure class="full-artwork"><img src="${escapeHtml(post.imageUrl)}" alt="Artwork attached to ${escapeHtml(post.title)}"></figure>` : ""}
    <p>${escapeHtml(post.body)}</p>
    <section class="comments-section" aria-label="Comments">
      <div class="comments-heading">
        <div>
          <p class="eyebrow">Marginalia</p>
          <h3>${comments.length} ${comments.length === 1 ? "comment" : "comments"}</h3>
        </div>
      </div>
      <div class="comment-list">
        ${
          comments.length
            ? comments
                .map(
                  (comment) => `
                    <article class="comment-card">
                      <div class="post-meta">
                        <span class="avatar">${initials(comment.author)}</span>
                        <span>${escapeHtml(comment.author)}</span>
                        <time datetime="${comment.createdAt}">${formatDate(comment.createdAt)}</time>
                      </div>
                      <p>${escapeHtml(comment.body)}</p>
                    </article>
                  `,
                )
                .join("")
            : `<p class="quiet-note">No comments yet. Be the first to leave a note in the margin.</p>`
        }
      </div>
      <form class="comment-form" data-post-id="${post.id}">
        <label>
          Add a comment
          <textarea name="comment" rows="4" ${state.currentUser ? "" : "disabled"} placeholder="${state.currentUser ? "Leave a thoughtful note." : "Sign in to comment."}" required></textarea>
        </label>
        <div class="editor-actions">
          <p>${state.currentUser ? `Commenting as ${escapeHtml(state.currentUser)}.` : "Sign in to comment."}</p>
          <button class="primary-action" type="submit" ${state.currentUser ? "" : "disabled"}>Post comment</button>
        </div>
      </form>
    </section>
  `;

  const closeButton = document.createElement("button");
  closeButton.className = "primary-action";
  closeButton.type = "button";
  closeButton.textContent = "Back to library";
  closeButton.addEventListener("click", renderPosts);

  postGrid.replaceChildren(wrapper);
  wrapper.append(closeButton);
  wrapper.querySelector(".comment-form").addEventListener("submit", handleCommentSubmit);
  emptyState.classList.add("hidden");
}

function commentsForPost(postId) {
  return state.comments
    .filter((comment) => comment.postId === postId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[character];
  });
}

function authorColor(author) {
  const colors = ["#275846", "#75312f", "#8f641d", "#4d1f1d"];
  const total = [...author].reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
  return colors[total % colors.length];
}

function renderMembers() {
  memberList.replaceChildren();
  state.users
    .slice()
    .sort((a, b) => a.username.localeCompare(b.username))
    .forEach((user) => {
      const count = state.posts.filter((post) => post.author === user.username).length;
      const card = document.createElement("article");
      card.className = "member-card";
      card.innerHTML = `
        <span class="avatar">${initials(user.username)}</span>
        <div>
          <strong>${escapeHtml(user.username)}</strong>
          <span>${count} ${count === 1 ? "post" : "posts"}</span>
        </div>
      `;
      memberList.append(card);
    });

  document.querySelector("#memberCount").textContent = state.users.length;
}

function renderEditor() {
  const button = postForm.querySelector("button[type='submit']");
  button.disabled = !state.currentUser || isLoading;
  editorHint.textContent = state.currentUser
    ? `Sealing entries as ${state.currentUser}.`
    : "Sign in to publish under your username.";
}

function render() {
  renderAccount();
  renderPosts();
  renderMembers();
  renderEditor();
}

function wireEvents() {
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  document.querySelector("#quickWriteButton").addEventListener("click", () => setView("write"));

  document.querySelector("#closeAuthButton").addEventListener("click", () => authDialog.close());

  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      authMode = button.dataset.authMode;
      authMessage.textContent = "";
      updateAuthMode();
    });
  });

  authForm.addEventListener("submit", handleAuthSubmit);
  postForm.addEventListener("submit", handlePostSubmit);
  searchInput.addEventListener("input", renderPosts);
  sortSelect.addEventListener("change", renderPosts);
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (hasSupabaseConfig) {
    await handleSupabaseAuth(username, password);
    return;
  }

  handleLocalAuth(username, password);
}

function handleLocalAuth(username, password) {
  const existingUser = getUser(username);

  if (authMode === "signup") {
    if (existingUser) {
      authMessage.textContent = "That username is already part of the guild.";
      return;
    }

    state.users.push({
      username,
      password,
      joinedAt: new Date().toISOString(),
    });
    state.currentUser = username;
    saveState();
    authDialog.close();
    render();
    return;
  }

  if (!existingUser || existingUser.password !== password) {
    authMessage.textContent = "Username or password did not match.";
    return;
  }

  state.currentUser = existingUser.username;
  saveState();
  authDialog.close();
  render();
}

async function handleSupabaseAuth(username, password) {
  authMessage.textContent = "Checking the guild roll...";
  const email = usernameToEmail(username);

  if (authMode === "signup") {
    const { data: existingProfile } = await db
      .from("profiles")
      .select("username")
      .ilike("username", username)
      .maybeSingle();

    if (existingProfile) {
      authMessage.textContent = "That username is already part of the guild.";
      return;
    }

    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (error) {
      authMessage.textContent = error.message;
      return;
    }

    if (!data.session) {
      authMessage.textContent = "Account created. Check Supabase email settings if login is not immediate.";
      return;
    }

    const { error: profileError } = await db.from("profiles").insert({
      id: data.user.id,
      username,
    });

    if (profileError) {
      authMessage.textContent = profileError.message;
      return;
    }
  } else {
    const { error } = await db.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      authMessage.textContent = "Username or password did not match.";
      return;
    }
  }

  authDialog.close();
  await loadSupabaseState();
}

async function handleLogout() {
  if (hasSupabaseConfig) {
    await db.auth.signOut();
    await loadSupabaseState();
    return;
  }

  state.currentUser = null;
  saveState();
  render();
}

async function handlePostSubmit(event) {
  event.preventDefault();
  if (!state.currentUser) {
    openAuth("login");
    return;
  }

  const title = document.querySelector("#titleInput").value.trim();
  const body = document.querySelector("#bodyInput").value.trim();
  const imageFile = imageInput.files?.[0] ?? null;
  if (!title || !body) return;

  if (hasSupabaseConfig) {
    let imageUrl = "";
    let imagePath = "";

    if (imageFile) {
      const uploadedImage = await uploadArtwork(imageFile);
      if (!uploadedImage) return;
      imageUrl = uploadedImage.url;
      imagePath = uploadedImage.path;
    }

    const { error } = await db.from("posts").insert({
      title,
      body,
      author_id: state.currentUserId,
      image_url: imageUrl,
      image_path: imagePath,
    });

    if (error) {
      editorHint.textContent = error.message;
      return;
    }

    postForm.reset();
    await loadSupabaseState();
    setView("feed");
    return;
  }

  state.posts.unshift({
    id: crypto.randomUUID(),
    title,
    body,
    author: state.currentUser,
    imageUrl: imageFile ? URL.createObjectURL(imageFile) : "",
    imagePath: "",
    createdAt: new Date().toISOString(),
  });

  saveState();
  postForm.reset();
  render();
  setView("feed");
}

async function uploadArtwork(file) {
  if (!file.type.startsWith("image/")) {
    editorHint.textContent = "Please choose an image file.";
    return null;
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${state.currentUserId}/${crypto.randomUUID()}.${extension}`;
  editorHint.textContent = "Uploading artwork...";

  const { error } = await db.storage.from("artwork").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    editorHint.textContent = error.message;
    return null;
  }

  const { data } = db.storage.from("artwork").getPublicUrl(path);
  return {
    path,
    url: data.publicUrl,
  };
}

async function handleCommentSubmit(event) {
  event.preventDefault();
  if (!state.currentUser) {
    openAuth("login");
    return;
  }

  const form = event.currentTarget;
  const postId = form.dataset.postId;
  const textarea = form.querySelector("textarea");
  const body = textarea.value.trim();
  if (!body) return;

  if (hasSupabaseConfig) {
    const { error } = await db.from("comments").insert({
      post_id: postId,
      author_id: state.currentUserId,
      body,
    });

    if (error) {
      form.querySelector(".editor-actions p").textContent = error.message;
      return;
    }

    textarea.value = "";
    await loadSupabaseState();
    const post = state.posts.find((entry) => entry.id === postId);
    if (post) showFullPost(post);
    return;
  }

  state.comments.push({
    id: crypto.randomUUID(),
    postId,
    body,
    author: state.currentUser,
    createdAt: new Date().toISOString(),
  });
  saveState();
  const post = state.posts.find((entry) => entry.id === postId);
  if (post) showFullPost(post);
}

initializeApp();
