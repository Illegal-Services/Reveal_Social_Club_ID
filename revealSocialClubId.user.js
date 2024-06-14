// ==UserScript==
// @name         Reveal R* SCID (RID) on Social Club Profile Page
// @namespace    Violentmonkey Scripts
// @version      1.1.0
// @description  Adds SCID (RID) to the Social Club profile page, compatible with 2Take1 "Fake Friends" (name:SCID) feature, for easy copy and paste into the "Scid.cfg" file.
// @author       IB_U_Z_Z_A_R_Dl
// @match        *://socialclub.rockstargames.com/member/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/js-cookie/3.0.1/js.cookie.min.js
// @grant        GM_setClipboard
// @downloadURL  https://github.com/Illegal-Services/Reveal_Social_Club_ID/releases/latest/download/revealSocialClubId.user.js
// @supportURL   https://github.com/Illegal-Services/Reveal_Social_Club_ID/issues
// @homepageURL  https://github.com/Illegal-Services/Reveal_Social_Club_ID
// ==/UserScript==


/*
 * CREDITS:
 * @poedgirl & @DJMC: Original script authors.
 * @IN2Moist: HTML page editing.
 *
 */


(function () {
  "use strict";

  const COPY_TO_CLIPBOARD = true;
  const TIMEOUT = 10000;
  const RETRY_INTERVAL = 1000;

  const insertToProfile = (element, htmlContent) => {
    // file deepcode ignore DOMXSS: trust
    element.innerHTML += `
      <span class="scid-info" style="margin-left:10px;">
        ${htmlContent}
      </span>
    `;
  };

  const fetchProfileData = (element, username) => {
    const BEARER_TOKEN = Cookies.get("BearerToken");
    if (!BEARER_TOKEN) {
      console.error("Bearer token not found. Make sure you are logged in.");
      return;
    }

    fetch(
      `https://scapi.rockstargames.com/profile/getprofile?nickname=${username}&maxFriends=3`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${BEARER_TOKEN}`,
          "X-Requested-With": "XMLHttpRequest",
        },
      }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to fetch Social Club ID for player "${username}". (HTTP Status: ${response.status})`
          );
        }
        return response.json();
      })
      .then((data) => {
        const scId = data.accounts[0].rockstarAccount.rockstarId;
        const scHexId = scId.toString(16);
        insertToProfile(
          element,
          `
            <p>
              Social Club ID (RID/SSID):
              <br>
              ${scId}
            </p>
            <hr>
            <p>
              2Take1 "Fake Friends" (name:SSID to hex):
              <br>
              ${username}:${scHexId}
            </p>
          `
        );
        if (COPY_TO_CLIPBOARD) {
          GM_setClipboard(`${username}:${scHexId}`, "text");
        }
      })
      .catch((error) => {
        console.error(error);
        insertToProfile(element, "<p>Failed to fetch Social Club ID.</p>");
      });
  };

  const waitForProfileHeaderElement = (startTime, username) => {
    const element = document.querySelector(
      '[class^="ProfileHeader__extraInfo"]'
    );

    if (
      element &&
      element.className &&
      /^ProfileHeader__extraInfo__\w{5}$/.test(element.className)
    ) {
      fetchProfileData(element, username);
    } else if (Date.now() - startTime < TIMEOUT) {
      setTimeout(
        () => waitForProfileHeaderElement(startTime, username),
        RETRY_INTERVAL
      );
    } else {
      console.error(
        "Failed to find the profile header element after 10 seconds of retries."
      );
      return;
    }
  };

  const extractUsernameFromUrl = () => {
    const match = /^\/member\/([a-zA-Z0-9_-]{1,16})(?:\/.*)?$/.exec(
      window.location.pathname
    );
    if (!match || match.length <= 0) {
      console.error("No username found in the URL");
      return;
    }
    const username = match[1];
    waitForProfileHeaderElement(Date.now(), username);
  };

  const initialize = () => {
    extractUsernameFromUrl();
  };

  initialize();
})();