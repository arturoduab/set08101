if(localStorage.getItem("auth")) {
    window.location.href = 'index.html';
}

document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("signin-form").addEventListener("submit", function(e) {
        e.preventDefault();

        let userError = document.getElementById("username-error");
        let pwdError = document.getElementById("pwd-error");
        userError.innerHTML = '';
        pwdError.innerHTML = '';

        let username = document.getElementById("username");
        let pwd = document.getElementById("password");

        if(username.value === "test" && pwd.value === "1234test") {
            localStorage.setItem("auth", "true");
            window.location.href = 'index.html';
        } else if (username.value !== "test") {
            userError.innerHTML = "User not found. Try again.";
        } else {
            pwdError.innerHTML = "Password incorrect. Try again";
        }
    });
})