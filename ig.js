document.addEventListener('DOMContentLoaded', async function () {
    var findNonFollowersButton = document.getElementById('findNonFollowers');
    findNonFollowersButton.addEventListener('click', async () => {
        var loadingLabel = document.createElement('label');
        loadingLabel.textContent = 'Loading...';
        loadingLabel.id = "loadingLabel";
        document.body.appendChild(loadingLabel);
        chrome.tabs.getSelected(null, async tab => {
            await GetAllAccountsThatDoNotFollowBack();
        });
    }, false);
}, false);

async function GetAllAccountsThatDoNotFollowBack() {
    let username = document.getElementById("usernameInput").value;
    username = username.replace('@', '');

    if (username === '') {
        return;
    }

    let followers = [], followings = []
    try {
        let res = await fetch(`https://www.instagram.com/${username}/?__a=1`)

        res = await res.json()
        let userId = res.graphql.user.id

        let after = null, has_next = true
        while (has_next) {
            await fetch(`https://www.instagram.com/graphql/query/?query_hash=c76146de99bb02f6415203be841dd25a&variables=` + encodeURIComponent(JSON.stringify({
                id: userId,
                include_reel: true,
                fetch_mutual: true,
                first: 50,
                after: after
            }))).then(res => res.json()).then(res => {
                has_next = res.data.user.edge_followed_by.page_info.has_next_page
                after = res.data.user.edge_followed_by.page_info.end_cursor
                followers = followers.concat(res.data.user.edge_followed_by.edges.map(({ node }) => {
                    return {
                        username: node.username,
                        full_name: node.full_name
                    }
                }))
            })
        }

        has_next = true
        after = null
        while (has_next) {
            await fetch(`https://www.instagram.com/graphql/query/?query_hash=d04b0a864b4b54837c0d870b0e77e076&variables=` + encodeURIComponent(JSON.stringify({
                id: userId,
                include_reel: true,
                fetch_mutual: true,
                first: 50,
                after: after
            }))).then(res => res.json()).then(res => {
                has_next = res.data.user.edge_follow.page_info.has_next_page
                after = res.data.user.edge_follow.page_info.end_cursor
                followings = followings.concat(res.data.user.edge_follow.edges.map(({ node }) => {
                    return {
                        username: node.username,
                        full_name: node.full_name
                    }
                }))
            })
        }
    } catch (err) {
        console.log('Invalid username')
    }

    console.log(followers);
    console.log(followings);

    let accountsThatDontFollowBack = [];
    followings.forEach((followingAcc) => {
        if (!followers.find((followerAcc) => followerAcc.username === followingAcc.username)) {
            accountsThatDontFollowBack.push(followingAcc);
        }
    });

    document.body.appendChild(getDownloadLinkElement(accountsThatDontFollowBack));

    //create a table with the account data that will be displayed in the html on the extension
    createTable(accountsThatDontFollowBack);
}

function getDownloadLinkElement(accounts) {

    var link = document.createElement("a");
    link.textContent = "Save list of non-follow-backers";
    link.download = "file.txt";
    link.style.textAlign = "center";

    var arr = accounts.map((account) => {
        return account.username;
    })

    var file = new Blob([arr.toString()], { type: 'text/plain' });

    link.href = URL.createObjectURL(file);

    //TODO: Decide how the hell to print this array out nicely to a file
    //right now it prints out as a csv with each account's username as a value
    //id like for it to print out each username on it's own line and nothing else - ???
    //this next line will output each username on it's own line but will insert a random ',' comma at the start of every line
    //var data = arr.map(account => { return account.username + '\n' });

    //this will print the accounts to the file as one string (i.e. no newlines) but will have "<username>" for all usernames
    //var data = JSON.stringify(arr.map(account => { return account.username }));
    //link.href = encodeURI("data:text/plain;" + data);

    return link;

}

function createTable(accounts) {
    var table = document.createElement('table');
    var tableBody = document.createElement('tbody');

    accounts.forEach(account => {
        var row = document.createElement('tr');

        var usernameCell = document.createElement('td');
        usernameCell.appendChild(document.createTextNode(account.username));
        row.appendChild(usernameCell);

        var fullNameCell = document.createElement('td');
        fullNameCell.appendChild(document.createTextNode(account.full_name));
        row.appendChild(fullNameCell);

        tableBody.appendChild(row);
    });

    const headerRow = document.createElement('tr');

    const usernameHeader = document.createElement('th');
    usernameHeader.appendChild(document.createTextNode('Username'));
    const fullNameHeader = document.createElement('th');
    fullNameHeader.appendChild(document.createTextNode('Full name'));

    headerRow.appendChild(usernameHeader);
    headerRow.appendChild(fullNameHeader);

    //remove loading label 
    document.body.removeChild(document.getElementById('loadingLabel'));
    table.appendChild(headerRow);
    table.appendChild(tableBody);
    document.body.appendChild(table);
}