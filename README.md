# Time Bend

<a href="https://play.google.com/store/apps/details?id=neelkamath.timebend">
  <img alt="Get it on Google Play" width="185" src="https://play.google.com/intl/en_us/badges/images/generic/en-play-badge.png" />
</a>

This is a hybrid mobile app (made for use on Android) for Chetan Surpur's idea technique of [time bending](https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=1&cad=rja&uact=8&ved=2ahUKEwi8m7ONzrPfAhXYa94KHaukBw0QFjAAegQICRAB&url=http%3A%2F%2Fchetansurpur.com%2Fblog%2F2012%2F10%2Ftime-bending.html&usg=AOvVaw2584-fWlB1HTkSybKr876d). It uses HTML5, CSS3, JavaScript, and Cordova.

This app was made using Cordova because before I had made this app, I needed it ASAP (my high school sophomore year's finals were in a few months and I didn't know native Android development).

This project has been deprecated because I later created a native version of it [here](https://gitlab.com/neelkamath/time-bend-android). I made it so that it would be scalable (e.g., being able to use SQLite on Android instead of storing JSON as a string in `window.localStorage`) and so that it would look better (e.g, material design over custom CSS3 animations). There are also numerous other benefits of using native Android development (such as reduced APK size, access to native OS features, etc.).

![Screenshot](screenshot.png)

# Installation

## Prerequisites

- [Cordova CLI](https://cordova.apache.org/docs/en/latest/guide/cli/index.html#installing-the-cordova-cli)
- [Android Dependencies](https://cordova.apache.org/docs/en/latest/guide/platforms/android/index.html#installing-the-requirements)

## Installing

1. Clone the repository with one of the following methods.
    - HTTPS: `git clone https://github.com/neelkamath/time-bend.git`
    - SSH: `git clone git@github.com:neelkamath/time-bend.git`
1. `cd time-bend/src`
1. `cordova prepare`

# Usage

1. `cd time-bend/src`
1. `cordova build android`

The APK will be located at `time-bend/src/platforms/android/app/build/outputs/apk/debug/app-debug.apk`.

# License

This project is under the [MIT License](LICENSE).
