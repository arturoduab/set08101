class Joke extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
    }

    connectedCallback() {
        const { shadowRoot } = this;

        const template = document.getElementById("jokes-template");
        const node = template.content.cloneNode(true);
        
        shadowRoot.appendChild(node);

        this.jokeText = this.shadowRoot.getElementById('joke-text');
        this.jokeText.textContent = this.getAttribute('data-joke');
        this.removeAttribute("data-joke");

        let authorText = this.shadowRoot.getElementById('author');
        authorText.textContent = this.getAttribute('data-author');
        this.removeAttribute("data-author");

        let likes = this.shadowRoot.getElementById('counter');
        likes.textContent = this.getAttribute('data-likes');
        this.counter = parseInt(likes.textContent);

        this.shadowRoot.querySelector('.increment-btn').addEventListener('click', this.incrementCounter.bind(this));
        this.shadowRoot.querySelector('.share-btn').addEventListener('click', this.shareContent.bind(this));
    }

    disconnectedCallback() {
        this.shadowRoot.querySelector('.increment-btn').removeEventListener('click', this.incrementCounter.bind(this));
        this.shadowRoot.querySelector('.share-btn').removeEventListener('click', this.shareContent.bind(this));
    }

    incrementCounter() {
        this.counter = this.counter + 1;
        this.shadowRoot.getElementById('counter').textContent = this.counter;

        let seStorage = JSON.parse(sessionStorage.getItem("jokes"));
        seStorage[this.getAttribute('data-id')].likes = this.counter;
        sessionStorage.removeItem("jokes");
        sessionStorage.setItem("jokes", JSON.stringify(seStorage));

        renderContent(seStorage);
        
    }

    shareContent() {
        const dataToShare = {
            title: "Jokesify",
            text: this.jokeText.textContent + "\nFind more jokes at https://arturoduab.github.io/set08101/",
        }

        try {
            navigator.share(dataToShare);
        } catch (err) {
            console.log(`Error: ${err}`);
        }
    }

    get counter() {
        return this._counter;
    }
    set counter(val) {
        this._counter = val;
        this.setAttribute('data-likes', val);
    }

}
customElements.define( 'joke-card', Joke );

function setCookie(dailyJoke) {
    // Calculate the end of the day, creates the content of the cookie (string), and sets it.
    // A cookie is set only for the joke of the day, at 00:00 a new cookie is set with a new joke.
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const cookieString = `${encodeURIComponent("dailyJoke")}=${encodeURIComponent(dailyJoke.id)};expires=${endOfDay.toUTCString()};path=/`;

    document.cookie = cookieString;
}

function sortDictByLikes(dictJokes) {
    // Return an array with jokes (objects) sorted by number of likes.
    return Object.values(dictJokes).sort((a, b) =>  b.likes - a.likes );
}

function createEndpoint(values) {
    // Creates the endpoint for fetching the data from the API. Check https://jokeapi.dev/ for documentation.
    // Values format is a dictionary (key - value pairs) with the information as the API needs it.
    // Returns a string.
    let endpoint = "https://v2.jokeapi.dev/joke/";

    if(values){
        if(values["filter"]) {
            endpoint =+ values.filter.toString() + "?";
            values.delete("filter");
        }
        else {
            endpoint = endpoint+"Any?";
        }

        for( key in values ) {
            endpoint = endpoint+key+"="+values[key]+"&";
        };

    } else {
        endpoint = endpoint+"Any?amount=10&";
    }
    
    return endpoint+"safe-mode";
}

function buildJokeCard(container, joke) {
    // Receives the container in which insert the joke card and an object with the joke.
    // Sets the information as attributes that will be read and some of them removed when the web component is created.
    const jel = document.createElement("joke-card");

    jel.setAttribute("data-id", joke.id);
    jel.setAttribute("data-cat", joke.category);
    jel.setAttribute("data-author", joke.author);
    jel.setAttribute("data-joke", joke.type === "single" ? joke.joke : joke.setup+"\n"+joke.delivery); // jokes can have 1 or 2 parts.
    jel.setAttribute("data-likes", joke.likes ? joke.likes : 0);
    
    container.appendChild(jel);
}

async function getInfo(selectedLang = "en") {
    // Gets info from the API related to the number of jokes per language and categories
    // Returns 
    const endpoint = "https://v2.jokeapi.dev/info";
    const request = await fetch(endpoint);
    const response = await request.json();

    idRange = response.jokes.safeJokes.find((langs) => { return langs.lang === selectedLang});
    categories = response.jokes.categories;

    return {"ids": idRange, "cats": categories};
}

async function loadJokes(idsCount) {
    // There is a limit of 10 in the number of jokes fetch from the API each time. This function takes the number of jokes as arguments,
    // and request the API N times until it fetches all the jokes.
    // Returns the dictionary with all the jokes as Promise object.
    let mergedDict = {};

    // Create an array of promises
    const promises = [];
    for (let i = 0; i < idsCount + 9; i += 10) {
        let endpoint = createEndpoint({ "idRange": i + "-" + (i + 9), "amount": 10 });
        promises.push(fetch(endpoint).then(response => response.json()));
    }

    // Wait for all promises to resolve, merge all dictionaries into a single dictionary
    return await Promise.all(promises).then( (response) => {

        response.forEach(dict => {
            jokesDict = {};

            if(dict.jokes){
                
                dict.jokes.forEach( item => {
                    jokesDict[item.id] = item;
                    jokesDict[item.id].author = "JokesAPI"; // In case CRUD system were implemented allowing an user to submit jokes.
                    jokesDict[item.id].likes = 0;
                });
                
                Object.assign(mergedDict, jokesDict);
            }
        });

        return mergedDict;

    });
}

function checkSession() {
    // Checks if the dictionary of jokes has been stored into session storage.
    // Return either the dictionary or false if it has not been stored.
    if(sessionStorage.getItem("jokes") && sessionStorage.getItem("jokes") !== undefined){
        return JSON.parse(sessionStorage.getItem("jokes"));
    }

    return false;
}

function isInPage() {
    // Checks the current page.
    // Returns null if the URL does not contain any page number (#page-N)
    if(window.location.hash.substring(1) && window.location.hash.substring(1).includes("page-")){
        return numActivePage = window.location.hash.substring(1).split('-')[1];
    }

    return null;
}

function createPagination(numPages) {
    // Takes the number of pages the jokes section should have and creates pagination at its bottom.
    // If user was in a page different than 1, it stays in that page and the number highlights as active page.
    const paginationSection = document.querySelector('.pagination ul');
    let activeClass;
    const numActivePage = isInPage();
    
    for(let i = 1; i <= numPages; i++) {
        let elLi = document.createElement('li');

        activeClass = (numActivePage === null && i === 1) || parseInt(numActivePage) === i ? 'class="active"' : '';
        elLi.innerHTML = `<a href="#page-${i}" onclick="pageSelection(this)" data-page-id="${i}" ${activeClass}>${i}</a>`;
        paginationSection.appendChild(elLi);
    }
}

function pageSelection(el) {
    // Hide or show page (section) when user hits in a page number.
    let page = el.getAttribute('data-page-id');
    
    if(!el.classList.contains("active")) {
        document.querySelector(".pagination ul li a.active").classList.remove("active");
        el.classList.add("active");
    }

    if(document.querySelector(".paginated-section.visible")){
        document.querySelector(".paginated-section.visible").classList.remove("visible");
    }
    document.querySelector(`[data-page="${page}"]`).classList.add("visible");

}

function needToRefreshJokes(current, updated) {
    // Checks if the jokes section needs to be refreshed. This is comparing the order of new array with the previous.
    // These arrays are sorted by the number of likes, so if a joke has climb positions, the arrays would be different.
    // Return true if it has changed and needs to be rendered again, false otherwise.
    if (current.length !== updated.length) {
        return true;
    }

    for (let i = 0; i < current.length; i++) {
        if (current[i] !== updated[i]) {
            return true;
        }
    }

    return false;
}

function renderContent(dictJokes, init = false) {
    
    if(dictJokes === false){
        const jokesPromise = getInfo("en").then( (response) => { return loadJokes(response.ids.count) });
    
        jokesPromise.then( (promiseDict) => {
    
            if (Object.keys(promiseDict).length !== 0) {
                sessionStorage.setItem("jokes", JSON.stringify(promiseDict));
            }
    
            renderContent(promiseDict, true);
        });

    } else {
        const sortedDictJokes = sortDictByLikes(dictJokes);
        let dailyJokeId;

        if(!document.cookie.includes('dailyJoke')) {
            setCookie(sortedDictJokes[Math.floor(Math.random() * sortedDictJokes.length)]);
        }
        document.cookie.split(';').forEach(cookie => {
            if(cookie.split('=')[0] === "dailyJoke") {
                const dailyJokeContainer = document.getElementById('daily-joke-content');

                dailyJokeId = cookie.split('=')[1];
                if(dictJokes[parseInt(dailyJokeId)].type === "single") {
                    dailyJokeContainer.innerHTML = `<p>${dictJokes[parseInt(dailyJokeId)].joke}</p>`;
                } else {
                    dailyJokeContainer.innerHTML = `<p>${dictJokes[parseInt(dailyJokeId)].setup}</p><p>${dictJokes[parseInt(dailyJokeId)].delivery}</p>`;
                }
            }
        });


        if(init || needToRefreshJokes(sortedDictJokes, Object.values(dictJokes))) {
            const container = document.getElementById('jokes-container');
            const numActivePage = isInPage();
            container.innerHTML = '';
            let counterPage = counter = 0;
            let containerPag;

            for(let key in sortedDictJokes) {
                if(counter % 12 === 0) {
                    counterPage++;
                    containerPag = document.createElement("section");
                    containerPag.setAttribute("data-page", counterPage);
                    containerPag.setAttribute("class", "paginated-section");
                    
                    if((numActivePage === null && counterPage === 1) || parseInt(numActivePage) === counterPage) {
                        containerPag.classList.add("visible");
                    }
                    container.appendChild(containerPag);
                    containerPag = document.querySelector('[data-page="'+counterPage+'"]');
                }
                buildJokeCard(containerPag, sortedDictJokes[key]);
                counter++
            };

            if(init) createPagination(counterPage);
        }
    }
}



// MAIN
document.addEventListener("DOMContentLoaded", () => {
    renderContent(checkSession(), true);
});