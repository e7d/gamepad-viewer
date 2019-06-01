$.urlParam = function(name) {
    let results = new RegExp('[\?&]' + name + '(=([^&#]*))?').exec(window.location.search);
    if (results === null) {
        return null;
    }

    return decodeURIComponent(results[2] || true) || true;
};
