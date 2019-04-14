"use strict";

// Impure function that listens to activity editing events including deletion.
function addEventListeners() {

    [].slice.call(document.getElementsByClassName("activityTxt")).forEach((activityTxt) => {

        activityTxt.addEventListener("change", () => {
            var activities = JSON.parse(localStorage.activities).activities;
            for (var activityData of activities) {
                if (activityTxt.value === activityData.activity) {
                    alert("That activity has already been created!");
                    return;
                }
            }
            var originalName = activityTxt.parentElement.title;
            if (activityTxt.value === "") {
                alert("Please specify the activity.");
                activityTxt.value = originalName;
                return;
            }
            for (var data of activities) {
                if (data.activity === originalName) {
                    data.activity = activityTxt.value;
                }
            }
            localStorage.activities = JSON.stringify({
                activities
            });
            updateActivities(window.matchMedia("(orientation: portrait)").matches);
        });

    });

    [].slice.call(document.getElementsByClassName("activityDuration")).forEach((activityDuration) => {

        activityDuration.addEventListener("change", () => {
            /*
                We should allow the user to be able to update the duration of an activity even if it makes the activity
                invalid as they might have taken a longer time to complete it.
            */

            var activitiesObj = JSON.parse(localStorage.activities).activities;
            var activityObj;
            for (var activityData of activitiesObj) {
                if (activityData.activity === activityDuration.parentElement.title) {
                    activityObj = activityData;
                    break;
                }
            }

            if (activityDuration.value === "") {
                alert("Please specify a duration for the activity.");
                activityDuration.value = activityObj.duration;
                return;
            }
            var newDuration = parseInt(activityDuration.value);
            if (activityDuration.value < 1 || activityDuration.value > 60) {
                alert("Your activities must be one to sixty minutes.");
                activityDuration.value = activityObj.duration;
                return;
            }
            activityObj.duration = newDuration;
            localStorage.activities = JSON.stringify({
                activities: activitiesObj
            });
            setActivityTime();
        });

    });

    [].slice.call(document.getElementsByClassName("activityCheckbox")).forEach((activityCheckbox) => {

        activityCheckbox.addEventListener("change", () => {
            var activityText = activityCheckbox.parentElement.title;
            pushActivity(activityText, activityCheckbox.checked);
            var activitiesObj = JSON.parse(localStorage.activities).activities;
            for (var activityData of activitiesObj) {
                if (activityData.activity === activityText) {
                    activityData.status = activityCheckbox.checked ? "complete" : "incomplete";
                    activityData.completed = activityCheckbox.checked ? new Date() : null;
                }
            }
            localStorage.activities = JSON.stringify({
                activities: activitiesObj
            });
            setActivityTime();
            maybeRewardUser();
            maybeActivateDeletor(); // Must be called after <setActivityTime> as it depends on the HTML getting updated.
        });

    });

    [].slice.call(document.getElementsByClassName("delActivity")).forEach((delActivity) => {

        delActivity.addEventListener("click", () => {
            if (confirm("Are you sure you want to delete this activity?")) {
                var activitiesObj = JSON.parse(localStorage.activities).activities;
                var newData = {
                    activities: []
                };
                for (var activityData of activitiesObj) {
                    if (activityData.activity !== delActivity.parentElement.title) {
                        newData.activities.push(activityData);
                    }
                }
                localStorage.activities = JSON.stringify(newData);
                makeActivityDisappear(delActivity.parentElement.title);

                // Wait for the animation to play before refreshing the view.
                setTimeout(setActivityTime, 1 * 1000);
            }
        });

    });

}

// Impure function that changes the theme (body of HTML). <theme> (<string>) is the name of the theme to apply.
function applyTheme(theme) {
    switch (theme) {
        case "Pink Oranges":
            document.body.style.background = "radial-gradient(circle at left, #ff007f, #ff7f00)";
        break;
        case "Aqua Blue":
            document.body.style.background = "radial-gradient(circle at left, #00ffe9, #0094ff)";
    }
}

// Returns a new <Date> object with hours and minutes from <string> (e.g., <s> should be <"15:38"> for 3:38 PM).
function convertHTMLTimeToDate(s) {
    var parts = s.split(":");
    var date = new Date();
    date.setHours(parseInt(parts[0]));
    date.setMinutes(parseInt(parts[1]));
    return date;
}

/*
    Impure function that returns the duration of activities in minutes (<number>).
    Parameters:
        type (<string>): set to <"complete"> to get duration of complete activities, <"incomplete"> for incomplete
                         activities and <"invalid"> for invalid activities
*/
function getActivitiesDuration(type="incomplete") {
    var activities = JSON.parse(localStorage.activities).activities;
    var duration = 0;
    for (var data of activities) {
        if (data.status === type) {
            duration += data.duration;
        }
    }
    return duration;
}

/*
    Impure function that gets the user's start and end of day. The date is today's date.
    Return values:
        <null>: user hasn't specified either start or end of day
        start and end of day (<object>): of the form {
                                             start: <Date>,
                                             end: <Date>
                                         }
*/
function getDates() {
    var timings = JSON.parse(localStorage.timings);
    if (timings.start === undefined || timings.end === undefined) {
        return null;
    } else {
        var start = convertHTMLTimeToDate(timings.start);
        var end = convertHTMLTimeToDate(timings.end);
        // If the user's day is from PM to AM instead of AM to PM, the end time is in the next day.
        if (end < start) {
            end.setDate(end.getDate() + 1);
        }
        return {
            start,
            end
        };
    }
}

/*
    Impure function to get reserve time in minutes (<number>) left in the day. This is the time remaining between the
    end of the user's day and either the start of the day or the current time (if the user's day has already started)
    minus the duration of all the incomplete (not invalid) activities. If the user hasn't specified the start or end of
    their day, <null> will be returned. A negative number may be returned if the duration of incomplete activities is
    greater than that of the time remaining in the user's day.
*/
function getReserveTime() {
    var dates = getDates();
    if (dates === null) {
        return null;
    }
    var start = dates.start;
    var end = dates.end;
    var now = new Date();
    if (now > start && now < end) {
        start = now;
    }
    var seconds = (end - start) / 1000;
    var mins = parseInt(seconds / 60);
    return mins - getActivitiesDuration();
}

// Impure function that invalidates activities the user doesn't have time for.
function invalidateActivities() {
    var activities = JSON.parse(localStorage.activities).activities;
    var reserveTime = getReserveTime();
    if (reserveTime === null || reserveTime > 0) {
        return;
    }
    var durationToRemove = -reserveTime;
    var durationRemoved = 0;
    for (var activity of activities) {
        if (activity.status === "invalid" || activity.status === "complete") {
            continue;
        }
        durationRemoved += activity.duration;
        activity.status = "invalid";
        if (durationRemoved >= durationToRemove) {
            break;
        }
    }
    var reordered = reorderActivities(activities);
    localStorage.activities = JSON.stringify({
        activities: reordered
    });
}

// Impure function that makes the activity having the text <txt> (<string>) play the <disappear> CSS animation.
function makeActivityDisappear(txt) {
    var activities = document.getElementsByClassName("activity");
    for (var activity of activities) {
        if (activity.title === txt) {
            activity.classList.remove("expand"); // The animation won't play if another is present.
            activity.classList.add("disappear");
        }
    }
}

/*
    Returns a one or two digit number, <num> (<number>), as a two digit number (<string>) (e.g., 6 will become <"06">
    and 12 will become <"12">).
*/
function makeTwoDigits(num) {
    var number = JSON.stringify(num);
    return number.length === 1 ? `0${number}` : number;
}

// Impure function that activates or deactivates a GUI button that deletes the previous day's activities.
function maybeActivateDeletor() {
    var deletor = document.getElementById("delOldActivitiesBlock");
    if (document.getElementsByClassName("oldActivity").length === 0) {
        deletor.style.display = "none";
    } else {
        deletor.style.display = "block";
    }
}

// Impure function that rewards the user if all their activities are complete.
function maybeRewardUser() {
    var activities = JSON.parse(localStorage.activities).activities;
    for (var activity of activities) {
        if (activity.status !== "complete") {
            return;
        }
    }
    alert("Great job! You finished all your tasks for the day!");
}

/*
    Impure function that performs actions common to both the <#dayStart> and <#dayEnd> HTML elements. <which> (<string>)
    is whether it's the day's start (<"start">) or day's end (<"end">) element.
*/
function performDayEvents(which) {
    var elem;
    switch (which) {
        case "start":
            elem = "dayStart";
        break;
        case "end":
            elem = "dayEnd";
    }
    var dayElement = document.getElementById(elem);
    dayElement.style.animationName = "rotateY";
    var seconds = 1.5;
    dayElement.style.animationDuration = `${seconds}s`;

    // Remove the animation after it's done playing so it'll play the next time it's needed.
    setTimeout(() => {
        dayElement.style.animationName = "";
        dayElement.style.animationDuration = "";
    }, seconds * 1000);

    var timings = JSON.parse(localStorage.timings);
    dayElement.value === "" ? timings[which] = undefined : timings[which] = dayElement.value;
    localStorage.timings = JSON.stringify(timings);
    setActivityTime();
    maybeActivateDeletor();
}

/*
    Impure function that moves the activity having the text <txt> (<string>) to the bottom or top both visually as well
    as in the code.
    Parameters:
        txt (<str>): the text of the activity needing the pushing
        bottom (<boolean>): set to <true> to push all the way to the bottom or <false> to push all the way to the top
*/
function pushActivity(txt, bottom = true) {
    var oldActivities = JSON.parse(localStorage.activities).activities;
    var activities = [];
    var particular;
    for (var data of oldActivities) {
        if (data.activity === txt) {
            particular = data;
        } else {
            activities.push(data);
        }
    }
    var index = bottom ? activities.length : 0;
    activities.splice(index, 0, particular);
    localStorage.activities = JSON.stringify({
        activities
    });
    updateActivities(window.matchMedia("(orientation: portrait)").matches);
}

// Impure function that returns <activities> (array) in the sequence: incomplete, invalid, complete (array).
function reorderActivities(activities) {
    var reorderedActivities = [];
    var completedActivities = [];
    var invalidActivities = [];
    for (var activity of activities) {
        switch (activity.status) {
            case "complete":
                completedActivities.push(activity);
            break;
            case "invalid":
                invalidActivities.push(activity);
            break;
            case "incomplete":
                reorderedActivities.push(activity);
        }
    }
    for (var invalidActivity of invalidActivities) {
        reorderedActivities.push(invalidActivity);
    }
    for (var completedActivity of completedActivities) {
        reorderedActivities.push(completedActivity);
    }
    return reorderedActivities;
}

// Impure function that sets the reserve time left which updates the activities as a (wanted) side effect.
function setActivityTime() {

    // First validate and invalidate the necessary activities.
    updateActivities(window.matchMedia("(orientation: portrait)").matches);

    var reserveLeftTxt = document.getElementById("reserveLeftTxt");
    var timings = document.getElementById("timings");
    var reserveTime = getReserveTime();
    if (reserveTime === null) {
        reserveLeftTxt.style.display = "none";
        timings.style.columnCount = 2;
    } else {
        var hours = parseInt(reserveTime / 60);
        var mins = reserveTime % 60;
        document.getElementById("reserveLeft").innerHTML = `${makeTwoDigits(hours)}:${makeTwoDigits(mins)}`;
        reserveLeftTxt.style.display = "block";
        timings.style.columnCount = 3;
    }
}

// Impure function to update activities. <portrait> (<boolean>) is which layout the user is in.
function updateActivities(portrait) {
    invalidateActivities();
    validateActivities();
    var timings = getDates();
    var activities = JSON.parse(localStorage.activities).activities;
    var activitiesHTML = "";
    for (var activity of activities) {
        var animes = JSON.parse(sessionStorage.activities).activities;
        var anime = "";
        for (var animeData of animes) {
            if (animeData.activity === activity.activity && animeData.status === null) {
                anime = "expand";
                animeData.status = "animated";
                sessionStorage.activities = JSON.stringify({
                    activities: animes
                });
            }
        }


        /*
            The checkbox should still be checkable if the activity is invalid as the user may have completed it before
            it got invalidated.
        */
        var checkboxData = activity.status === "complete" ? "checked" : "";

        var activityStatus = "";
        var ifOld = "";
        if (activity.status === "invalid") {
            activityStatus = "You don't have enough time for this!";
        } else if (timings !== null && activity.completed !== null && new Date(activity.completed) < timings.start) {
            activityStatus = "Previous day's activity";
            ifOld = "oldActivity";
        }
        activityStatus = `<div class="${portrait ? "floatLeft" : "floatRight"} statusTxt">${activityStatus}</div>`;
        var forPortrait = portrait ? activityStatus : "";
        var forLandscape = portrait ? "" : activityStatus;
        activitiesHTML += `
            <div class="activity clearFloat ${activity.status}Activity ${anime} ${ifOld}" title="${activity.activity}">
                ${forPortrait}
                <input class="activityTxt floatLeft" placeholder="Activity" type="text" value="${activity.activity}">
                <input class="activityDuration durationInput floatLeft" max="60" min="1" placeholder="Duration"
                       type="number" value="${activity.duration}">
                <input class="activityCheckbox floatRight" type="checkbox" ${checkboxData}>
                <input class="delActivity floatRight" type="button" value="X">
                ${forLandscape}
            </div>
        `;
    }
    document.getElementById("activities").innerHTML = activitiesHTML;
    addEventListeners();
}

// Impure function that validates activities the user now has time for.
function validateActivities() {
    var reserveTime = getReserveTime();
    if (reserveTime === null || reserveTime <= 0) {
        return;
    }
    var duration = 0;
    var activities = JSON.parse(localStorage.activities).activities;
    for (var activity of activities) {
        if (activity.status !== "invalid") {
            continue;
        }
        var durationToBeAdded = activity.duration;
        if (duration + durationToBeAdded >= reserveTime) {
            continue; // We can't validate activities that are long enough to cut into the user's reserve time.
        } else {
            activity.status = "incomplete";
            duration += durationToBeAdded;
        }
    }
    var reordered = reorderActivities(activities);
    localStorage.activities = JSON.stringify({
        activities: reordered
    });
}

if (localStorage.theme === undefined) {
    // Keep a theme to default to as otherwise no theme will be applied and the foreground gets messed up.
    localStorage.theme = JSON.stringify({
        theme: "Aqua Blue"
    });
}
var themeApplying = JSON.parse(localStorage.theme).theme;
applyTheme(themeApplying);
document.getElementById("changeTheme").value = themeApplying;
if (localStorage.activities === undefined) {
    localStorage.activities = JSON.stringify({
        activities: []
    });
}
let activitiesObj = {
    activities: []
};
let localStorageActivities = JSON.parse(localStorage.activities).activities;
for (let activity of localStorageActivities) {
    activitiesObj.activities.push({
        activity: activity.activity,
        status: null
    });
}
sessionStorage.activities = JSON.stringify(activitiesObj);
if (localStorage.timings === undefined) {
    localStorage.timings = JSON.stringify({});
}
let dayStart = document.getElementById("dayStart");
let dayEnd = document.getElementById("dayEnd");
let timings = JSON.parse(localStorage.timings);
if (timings.start !== undefined) {
    dayStart.value = timings.start;
}
if (timings.end !== undefined) {
    dayEnd.value = timings.end;
}
setActivityTime();

// Update every 30 seconds instead of one minute in case it was off the first time.
setInterval(setActivityTime, 30 * 1000);

maybeActivateDeletor();
setInterval(maybeActivateDeletor, 60 * 1000);
dayStart.addEventListener("change", () => performDayEvents("start"));
dayEnd.addEventListener("change", () => performDayEvents("end"));

window.addEventListener("load", () => {
    for (var elem of [dayStart, dayEnd]) {
        elem.style.animationName = "rotateX";
        elem.style.animationDuration = "1.8s";
    }

    setTimeout(() => {
        for (var elem of [dayStart, dayEnd]) {
            elem.style.animationName = "";
            elem.style.animationDuration = "";
        }
    }, 1.8 * 1000);

});

window.matchMedia("(orientation: portrait)").addListener((event) => updateActivities(event.matches));

document.getElementById("delOldActivities").addEventListener("click", () => {
    if (!confirm("Are you sure you want to delete all of your previous session's completed activities?")) {
        return;
    }
    var oldActivities = document.getElementsByClassName("oldActivity");
    var toDo = [];
    for (var oldActivity of oldActivities) {
        toDo.push(oldActivity.title);
    }
    var newActivities = [];
    var activities = JSON.parse(localStorage.activities).activities;
    for (var activity of activities) {
        toDo.includes(activity.activity) ? makeActivityDisappear(activity.activity) : newActivities.push(activity);
    }
    localStorage.activities = JSON.stringify({
        activities: newActivities
    });

    // Wait for the animation(s) to play.
    setTimeout(() => {
        updateActivities(window.matchMedia("(orientation: portrait)").matches);
        maybeActivateDeletor();
    }, 1 * 1000);

});

document.getElementById("howToGuideButton").addEventListener("click", () => {
    window.open("http://chetansurpur.com/blog/2012/10/time-bending.html");
});

document.getElementById("changeTheme").addEventListener("change", () => {
    var theme = document.getElementById("changeTheme").value;
    applyTheme(theme);
    var themes = JSON.parse(localStorage.theme);
    themes.theme = theme;
    localStorage.theme = JSON.stringify(themes);
});

document.getElementById("createNewActivity").addEventListener("submit", (e) => {
    e.preventDefault(); // Don't refresh the page, otherwise <sessionStorage> is lost and so is the user's pending data.
    var reserveTime = getReserveTime();
    if (reserveTime === null) {
        alert("Please specify the start and end of your day.");
        return;
    }
    var newMins = document.getElementById("newActivityMins");
    var duration = parseInt(newMins.value);
    if (reserveTime <= duration) {
        alert("You don't have that much time in your day!");
        return;
    }
    var activities = JSON.parse(localStorage.activities).activities;
    var activity = document.getElementById("newActivityTxt").value;
    for (var activityData of activities) {
        if (activityData.activity === activity) {
            alert("You've already created that activity. Edit or delete that one.");
            return;
        }
    }
    document.getElementById("createNewActivity").reset();

    // Place the new activity at the top so it doesn't go below the completed ones.
    activities.splice(0, 0, {
        activity,
        duration,
        status: "incomplete",
        completed: null
    });

    localStorage.activities = JSON.stringify({
        activities
    });
    var animes = JSON.parse(sessionStorage.activities).activities;
    animes.push({
        activity,
        status: null
    });
    sessionStorage.activities = JSON.stringify({
        activities: animes
    });
    setActivityTime();
});
