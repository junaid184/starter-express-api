import puppeteer from "puppeteer";
import https from 'https';
import axios from 'axios';
const sessionStart = async (url) => {//start the session
    const browser = await puppeteer.launch({ // initialize puppeteer
        headless: true, // chromium will not open when true
        args: ['--start-fullscreen'] //full screen chromium
    });
    const page = await browser.newPage();
    await page.setViewport({
        width: 1500,
        height: 900,
        deviceScaleFactor: 2,
    });
    try {
        let response = {}; //get all the data 
        const refund = await returnPolicy(page, url); // check refund policy
        response.refund = refund;
        console.log(refund);
        hasSSLCertificate(url) //check ssl 
            .then((hasCert) => {
                console.log(`Does the website have an SSL certificate? ${hasCert}`);
                response.ssl = hasCert;
            })
            .catch((err) => {
                console.error(err);
            });
        let productArray = []; // get all products json
        await axios.get(`${url}/products.json`)
            .then(res => {
                productArray = res.data.products;
            }).catch((e) => {
                return response = {
                    error: true,
                    message: "Products.json Not Found"
                }
            })
        const productsInformation = await getReviewAll(productArray, url, page) //get review of all product
        response.productsInformation = productsInformation;
        browser.close(); // in the end close the browser
        return response; //return data
    }
    catch (e) {
        console.log("website can't be opening", e);
    };
};

const openWebsite = async (page, url) => {

    try {
        await page.goto(url);
        await page.waitForTimeout(5000); // wait for 5 seconds for popups
        await page.mouse.click(500, 103, { button: 'left' }); //close the popups
        await page.goto(url); // reload page 
    }
    catch (e) {
        console.log("Website cannot be oppened please try again 10 minutes later.");
        console.log(e.message);
    };
};

const gettingReviews = async (page) => {
    try {
        // await page.waitForNavigation();
        // await page.waitForTimeout(2000);
        const extractedText = await page.$eval('body', (el) => el.innerText); //extract all the text
        const string = extractedText.toLowerCase();
        const review = await findPreviousNumber(string); // find review number
        return review;
    }
    catch (e) {
        console.log(e.message);
    };
};

const getReviewAll = async (productArray, url, page) => { //get all the reviews from the product.json 
    console.log(url);
    let response = []; // all review array 
    let testingUrl = [ // all possible url 
        `${url}/collections/${productArray[0]?.product_type}/products/${productArray[0]?.handle}`,
        `${url}/shop/${productArray[0]?.handle}`,
        `${url}/products/${productArray[0]?.handle}`];
    const getReview = async (index) => {  // get review one by one from productArray
        for (const element of productArray) {
            // await page.waitForTimeout(2000);
            //checking all url 
            let productUrl = `${url}/collections/${element.product_type}/products/${element.handle}`
            if (index === 1) {
                productUrl = `${url}/shop/${element.handle}`;
            }
            if (index === 2) {
                productUrl = `${url}/products/${element.handle}`
            }
            await openWebsite(page, productUrl); //open product
            console.log("website oppened... now getting review");
            const review = await gettingReviews(page); // get review of current product 

            let products = { //initializing object 
                reviews: {}
            }
            products.reviews.count = (review) ? review : 0;
            products.reviews.exist = (review) ? true : false;
            products.image = (element?.images.length > 0) ? true : false;
            products.description = element.body_html;
            products.productName = element.title;
            products.url = productUrl;
            console.log("product object: ", products);
            response.push(products);
            break;
        }
        return response;
    }
    for (let i = 0; i <= testingUrl.length; i++) { // checking all possible url which one is available
        console.log("now checking: ", testingUrl[i]);
        await openWebsite(page, testingUrl[i]); //open product
        const bodyText = await page.$eval('body', el => el.innerText);
        if (!bodyText.includes(404)) { // if not 404 then get the reviews
            const review = await getReview(i);
            return review;
        }
        else {
            console.log("checking next url");
        }
    }

}

function findPreviousNumber(string) { // finds if review keyword's previous word is number or not
    const words = string.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
        if (words[i] === "review" || words[i] === "reviews") {
            if (i > 0 && !isNaN(words[i - 1])) {
                return Number(words[i - 1]);
            } else {
                // If previous word is a number, find another review
                for (let j = i + 1; j < words.length; j++) {
                    if (words[j] === "review" || words[j] === "reviews") {
                        if (j > 0 && !isNaN(words[j - 1])) {
                            return Number(words[j - 1]);
                        };
                    }
                };
            };
        }
    };
    return null; // If no suitable review is found
};
const hasSSLCertificate = (url) => { //check ssl certificate
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            const hasCert = !!res.socket.getPeerCertificate();
            resolve(hasCert);
        });

        req.on('error', (err) => {
            reject(err);
        });
    });
};

const returnPolicy = async (page, url) => { // get return policy of vendor
    console.log("finding return policy");
    await page.goto("https://www.google.com");
    await page.waitForSelector('textarea');
    await page.type('textarea', `${url} return policy`);
    await page.keyboard.press('Enter');
    await page.waitForSelector('h3');
    const h3 = await page.$$('h3');
    h3[0].click();
    await page.waitForNavigation();
    const extractedText = await page.$eval('*', (el) => el.innerText);
    const string = extractedText.toLowerCase();
    const returnsIndex = string.indexOf('returns');
    const returnPolicy = string.substring(returnsIndex);
    return returnPolicy;
};

export default sessionStart;