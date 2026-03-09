// # Buscar posts ao backend
fetch("http://localhost:5000/api/posts")
  .then((response) => response.json())
  .then((posts) => {
    // # Ir buscar o container onde vamos mostrar os artigos
    const container = document.getElementById("posts-container");

    // # Limpar conteúdo inicial
    container.innerHTML = "";

    // # Percorrer os posts e criar HTML
    posts.forEach((post) => {
      const postCard = document.createElement("div");
      postCard.className = "post-card";

      postCard.innerHTML = `
        <h3>${post.title}</h3>
        <p>${post.excerpt}</p>
        <small>Slug: ${post.slug}</small>
      `;

      container.appendChild(postCard);
    });
  })
  .catch((error) => {
    console.error("Erro ao buscar posts:", error);

    const container = document.getElementById("posts-container");
    container.innerHTML = "<p>Erro ao carregar os artigos.</p>";
  });