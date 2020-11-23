const url = 'https://graphql.anilist.co';

const initialDataQuery = `
    query($userName: String) {
       User(name: $userName) {
        id
      }
    }
`;

const commentQuery = `
    query($page: Int, $userId: Int) {
      Page(page:$page) {
        pageInfo {
          lastPage
        }
        threadComments(userId:$userId) {
          thread {
            userId
          }
          threadId
          id
          comment
        }
      }
    }
`;

let options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
};

let commentsData = [];

var allAwcComments = [],
    prevUserID = false;

const handleResponse = (response) => {
   if(response.headers.get("X-RateLimit-Remaining") == 0) {
     handleError("Rate Limit has been exceeded. Please wait a minute and try again.");
   }
    return response.json().then(function(json) {
        return response.ok ? json : Promise.reject(json);
    });
};

const handleError = (error) => {
    console.log(error);
    let errorText = $("#error-text").text();
    if(errorText) {
        $("#error-text").text(errorText + "\r\n" + error);
    }
    else {
        $("#error-text").text(error);
    }
    $("#error-div").css("visibility", "visible");
    $("#load-matches").prop("disabled", false);
};

var mediaIDToFind = false,
    matchMediaRegex = false;
const startDoingTheThing = () => {
    $("#load-matches").prop("disabled", true);
    $("#error-div").css("visibility", "hidden");
    $("#error-text").text("");
    mediaIDToFind = false;
    matchMediaRegex = false;

    let urlInput = $("#url-input").val(),
        nameInput = $("#name-input").val();
    let mediaIDMatch = urlInput.match(new RegExp(/(anilist\.co){1}[\/]{1}((anime)|(manga)){1}[\/]{1}([0-9]+){1}/gm)) || [];

    if(!mediaIDMatch[0]) {
        handleError("Unable to parse given media URL");
        return;
    }
  
    mediaIDToFind = Number(mediaIDMatch[0].split('/')[2]);

    request(url, options, initialDataQuery, {
        userName: nameInput
    }, undefined, (d) => {
        let data = d && d.data;
        let userID = data && data.User && data.User.id;
        if(userID && mediaIDToFind) {
            let regexString = `(\\[.+\\]\\()?(https:\/\/)?(anilist\.co){1}[\/]{1}((anime)|(manga)){1}[\/]{1}(${mediaIDToFind}){1}(([0-9]{0}[\/]{1}[^)\\s]*[)]?){1}|$|[)]{1})`;
            matchMediaRegex = new RegExp(regexString, "gm");
            commentsData = [];
          
            if(prevUserID && prevUserID == userID) {
              filterPrevFoundComments(allAwcComments);
              updateCommentsTable(commentsData);
            }
            else {
              allAwcComments = [];
              getComments(userID);
            }
        }
        else {
            handleError("Inputs are missing or data was not retrieved successfully.");
        }
    });
};

let commentsTable = false;
const updateCommentsTable = (data) => {
    if (commentsTable) {
        commentsTable.destroy();
        commentsTable = undefined;
    }
    if (!data[0]) {
        handleError("No table data.");
    }
  
    let columns = [
          {
            title: 'Challenge',
            data: 'challenge'
          },
          {
            title: 'Matched Text',
            data: 'matchedText'
          },
          {
              title: 'Link',
              data: 'link'
          }
      ];

    commentsTable = $('#comments').DataTable({
        data: data,
        fixedHeader: true,
        paging: false,
        info: false,
        columns: columns
    });
    $("#load-matches").prop("disabled", false);
};

const handleComments = (data) => {
    data.data.Page.threadComments.forEach((a) => {
        if(a.threadId != 4446 && (a.thread && a.thread.userId && (a.thread.userId == 131231 || a.thread.userId == 207043)) || !a.thread) {
          allAwcComments.push(a);
          let matchedText = a.comment.match(matchMediaRegex) || [];
          if(matchedText.length) {      
            commentsData.push({
                challenge: findChallengeNameFromThreadID(a.threadId),
                matchedText: matchedText.join('<br/>'),
                link: `<a href="https://anilist.co/forum/thread/${a.threadId}/comment/${a.id}">LINK</a>`
            });
          }
        }
    });
};

const filterPrevFoundComments = (comments) => {
    comments.forEach((a) => {
        if(a.threadId != 4446 && (a.thread && a.thread.userId && (a.thread.userId == 131231 || a.thread.userId == 207043)) || !a.thread) {
          let matchedText = a.comment.match(matchMediaRegex) || [];
          if(matchedText.length) {      
            commentsData.push({
                challenge: findChallengeNameFromThreadID(a.threadId),
                matchedText: matchedText.join('<br/>'),
                link: `<a href="https://anilist.co/forum/thread/${a.threadId}/comment/${a.id}">LINK</a>`
            });
          }
        }
    });
};

const findChallengeNameFromThreadID = (threadID) => {
  switch(threadID) {
    case 5288:
      return "Action Genre";
    case 6111:
      return "Adventure Genre";
    case 5289:
      return "Comedy Genre";
    case 5875:
      return "Drama Genre";
    case 6631:
      return "Ecchi Genre";
    case 5290:
      return "Fantasy Genre";
    case 5559:
      return "Hemtai Genre";
    case 5558:
      return "Horror Genre";
    case 6376:
      return "Mahou Shoujo Genre";
    case 6112:
      return "Mecha Genre";
    case 6375:
      return "Music Genre";
    case 5557:
      return "Mystery Genre";
    case 5556:
      return "Psych/Thriller Genre";
    case 5291:
      return "Romance Genre";
    case 5292:
      return "Sci-Fi Genre";
    case 5293:
      return "Slice of Life Genre";
    case 5876:
      return "Sports Genre";
    case 6630:
      return "Supernatural Genre";
    case 7738:
      return "Rainbow";
    case 7566:
      return "Monogatari";
    case 9002:
      return "Makoto Shinkai";
    case 10377:
      return "2019 Classic";
    case 7104:
      return "2018 Classic";
    case 8037:
      return "Jojo's";
    case 7567:
      return "Satoshi Kon";
    case 10366:
      return "Staff Picks 2019";
    case 12963:
      return "Initial D";
    case 9352:
      return "Kyoto Animation";
    case 13775:
      return "Wit Studio";
    case 7284:
      return "Studio Ghibli";
    case 13347:
      return "2017 Classic";
    case 5027:
      return "Intermediate Tier";
    case 4448:
      return "Beginner Tier";
    case 8462:
      return "Advanced Tier";
    default:
      return "Other";
  }
}

const request = (url, options, query, variables, page, dataCallback) => {
    if(page) {
        variables.page = page;
    }
    options.body = JSON.stringify({
        query: query,
        variables: variables,
    });
    return new Promise(function (resolve, reject) {
        fetch(url, options)
            .then(handleResponse)
            .then(data => {
                dataCallback(data);
                resolve();
            })
            .catch(handleError);
    });
}

const getComments = (user) => {
    var variables = {
        page: 1,
        userId: user
    }

    let initialOptions = options;
    initialOptions.body = JSON.stringify({
        query: commentQuery,
        variables: variables,
    });

    fetch(url, initialOptions)
        .then(handleResponse)
        .then(data => {
            handleComments(data);
            let promises = [];
            let pageInfo = data && data.data && data.data.Page && data.data.Page.pageInfo;
            if(pageInfo) {
                if (pageInfo.lastPage > 1) {
                    for (let page = 2; page <= pageInfo.lastPage; page++) {
                        promises.push(request(url, options, commentQuery, variables, page, handleComments));
                    }
                }
            }
            else {
                handleError("Initial request data was malformed, try again.");
            }

            Promise.all(promises).then(() => {
                updateCommentsTable(commentsData);
                prevUserID = user;
            });
        })
        .catch(handleError);
};

const init = () => {
  
};