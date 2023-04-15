function sendUrl() {
    const url = document.getElementById("urlInput");
    const urlValue = url.value;
    console.log(urlValue);
    axios.get('http://localhost:8000/getdata', {
        url: urlValue
    }).then((data) => {
        console.log(data);
    })
}
