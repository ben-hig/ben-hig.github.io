const userTimezone = moment.tz.guess(true);
const url = 'https://graphql.anilist.co';
var dateFormat = "DD-MM-YYYY HH:mm:ss";

const commentQuery = `
    query ($threadId: Int, $commentId: Int) {
        ThreadComment (threadId: $threadId, id: $commentId) {
            id
            comment
            user {
                id
                name
            }
            createdAt
            childComments
        }
    }
`;

const activityQuery = `
    query ($page: Int, $userId: Int, $mediaIds: [Int]) {
        Page (page: $page) {
            pageInfo {
                lastPage
            }
            activities (userId: $userId mediaId_in: $mediaIds) {
                ... on ListActivity {
                    id
                    status
                    progress
                    createdAt
                    media {
                        title {
                            romaji
                            english
                        }
                        type
                        episodes
                        chapters
                    }
                }
            }
        }
    }`;

let options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
};

let activityData = [];

const handleResponse = (response) => {
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
    $("#redKey").css("visibility", "hidden");
    $("#greenKey").css("visibility", "hidden");
    $("#load-activities").prop("disabled", false);
};

var challengeStart = false;
const startDoingTheThing = () => {
    $("#load-activities").prop("disabled", true);
    $("#error-div").css("visibility", "hidden");
    $("#error-text").text("");
    $("#user-name").text("");
    challengeStart = false;
    dateFormat = $('#dateFormat :selected').val();
    localStorage.setItem('date-format', dateFormat);
  
    let URL = $("#url-input").val();

    let splitURL = URL.split("?")[0].split("#")[0].split("/");
    let threadID = splitURL[splitURL.length - 3];
    let commentID = splitURL[splitURL.length - 1];

    if(!threadID || !commentID) {
        handleError("Unable to parse challenge post URL");
        return;
    }

    request(url, options, commentQuery, {
        threadId: threadID,
        commentId: commentID
    }, undefined, (d) => {
        let data = d && d.data;
        let commentText = data && data.ThreadComment && data.ThreadComment[0] && data.ThreadComment[0].comment;
        let userID = data && data.ThreadComment && data.ThreadComment[0] && data.ThreadComment[0].user && data.ThreadComment[0].user.id;
        let botComment = false;
        if(threadID == 10745) { //Raffle #2
            botComment = data && data.ThreadComment && data.ThreadComment[0] && data.ThreadComment[0].childComments && (data.ThreadComment[0].childComments.filter((c) => {
                return c.user.id == 127773 || c.user.id == 515733; //trapper & botchan
            }) || [false])[0];
        }
        if(botComment) {
            challengeStart = moment.unix(botComment.createdAt).tz(userTimezone);
        }
        else {
            challengeStart = moment.unix(data.ThreadComment[0].createdAt).tz(userTimezone);
        }
        if(commentText && userID) {
            $("#user-name").html(`${data.ThreadComment[0].user.name}'s Challenge<br/>Started - ${challengeStart.format(dateFormat)}`);
            let regexMedia = new RegExp(/(anilist\.co){1}[\/]{1}((anime)|(manga)){1}[\/]{1}([0-9]+){1}/gm),
                mediaLinks = commentText.match(regexMedia),
                mediaIDs = [];

            let numMedia = (mediaLinks || []).length;

            if(numMedia > 0) {                            
                for(let index in mediaLinks){
                    let mediaID = mediaLinks[index].split('/');
                    mediaIDs.push(Number(mediaID[2]));
                }
            }
            else {
                handleError("No anime or manga links.");
                return;
            }
          
            mediaIDs = mediaIDs.filter((item, index) => { return mediaIDs.indexOf(item) === index && item != 0 });
            getActivities(userID, mediaIDs);
        }
        else {
            handleError("Challenge post data is missing or was not retrieved successfully.");
        }
    });
};

let activitiesTable = false;
const updateActivityTable = (data) => {
    if (activitiesTable) {
        activitiesTable.destroy();
        activitiesTable = undefined;
    }
    if (!data[0]) {
        handleError("No table data.");
    }
  
    let columns = [
          {
              title: 'English Title',
              data: 'etitle'
          },
          {
              title: 'Romaji Title',
              data: 'rtitle'
          },
          {
              title: "Eps/Chaps",
              data: 'mediaLength'
          },
          {
              title: 'Progress',
              data: 'progress',
          },
          {
              title: 'Date',
              data: 'created',
          },
          {
              title: 'Link',
              data: 'link'
          }
      ];
  
    let animeCount = data.filter((d) => {
      return d.type == "ANIME";
    }).length;
  
    if(animeCount != data.length && animeCount != 0) {
      columns.splice(3, 0, { title: 'Type', data: 'type' });
    }

    activitiesTable = $('#activities').DataTable({
        data: data,
        fixedHeader: true,
        paging: false,
        info: false,
        columns: columns,
        order: [
            [1, 'asc'],
            [4, 'desc'],
        ],
        createdRow: function(row, data, dataIndex) {
           if (challengeStart && challengeStart.isAfter(data.created.split('</span>')[0].split('>')[1])) {        
               $(row).addClass('red');
           }
           else if(challengeStart) {
             $(row).addClass('green');
           }
        }
    });
    $("#redKey").css("visibility", "visible");
    $("#greenKey").css("visibility", "visible");
    $("#load-activities").prop("disabled", false);
};

const handleActivity = (data) => {
    data.data.Page.activities.forEach((a) => {
        let mediaType = a.media.type.toUpperCase();

        let consumptionType = "";
        if(a.status.toUpperCase() == "REWATCHED EPISODE") {
            consumptionType = "Rewatched";
        }
        else if(a.status.toUpperCase() == "WATCHED EPISODE") {
            consumptionType = "Watched";
        }
        else if(a.status.toUpperCase() == "READ CHAPTER") {
            consumptionType = "Read";
        }
        else if(mediaType == "MANGA") { //TODO idk what this status text is from AL
            consumptionType = "Re-Read";
        }
      
        let createdAtDate = moment.unix(a.createdAt).tz(userTimezone);

        if (a.progress !== null && a.progress != "0") {
            activityData.push({
                progress: `${consumptionType} ${a.progress}`,
                etitle: a.media.title.english || "-",
                rtitle: a.media.title.romaji || "-",
                mediaLength: mediaType == "ANIME" ? a.media.episodes : a.media.chapters,
                created: `<span>${createdAtDate.format('YYYY-MM-DD HH:mm:ss')}</span>${createdAtDate.format(dateFormat)}`,
                link: `<a href="https://anilist.co/activity/${a.id}">LINK</a>`,
                type: mediaType
            });
        } else {
            activityData.push({
                progress: a.status.toUpperCase(),
                etitle: a.media.title.english || "-",
                rtitle: a.media.title.romaji || "-",
                mediaLength: mediaType == "ANIME" ? a.media.episodes : a.media.chapters,
                created: `<span>${createdAtDate.format('YYYY-MM-DD HH:mm:ss')}</span>${createdAtDate.format(dateFormat)}`,
                link: `<a href="https://anilist.co/activity/${a.id}">LINK</a>`,
                type: mediaType
            });
        }
    });
};

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

const requestSynchronous = (url, options, query, variables, page, dataCallback) => {
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
                if(data && data.data && data.data.Page && data.data.Page.activities && data.data.Page.activities.length > 0) {
                  requestSynchronous(url, options, activityQuery, variables, page+1, handleActivity)
                    .then(resolve);
                }
                else {
                  resolve();
                }
            })
            .catch(handleError);
    });
}

const getActivities = (user, anime) => {
    var variables = {
        page: 1,
        userId: user,
        mediaIds: anime,
    }

    activityData = [];
    let initialOptions = options;
    initialOptions.body = JSON.stringify({
        query: activityQuery,
        variables: variables,
    });

    fetch(url, initialOptions)
        .then(handleResponse)
        .then(data => {
            handleActivity(data);
            let promises = [];
            let pageInfo = data && data.data && data.data.Page && data.data.Page.pageInfo;
            if(pageInfo) {
                if (pageInfo.lastPage > 1) {
                  if(pageInfo.lastPage < 91) {
                    for (let page = 2; page <= pageInfo.lastPage; page++) {
                        promises.push(request(url, options, activityQuery, variables, page, handleActivity));
                    }
                  }
                  else {
                    promises.push(requestSynchronous(url, options, activityQuery, variables, 2, handleActivity));
                  }
                }
            }
            else {
                handleError("Initial request data was malformed, try again.");
            }

            Promise.all(promises).then(() => {
                updateActivityTable(activityData);
            });
        })
        .catch(handleError);
};

const init = () => {
    let dateFormat = localStorage.getItem('date-format');
    if(dateFormat) {
        $('#dateFormat').val(dateFormat).change();
    }
    else {
        $('#dateFormat').val('DD-MM-YYYY HH:mm:ss').change();
    }
};