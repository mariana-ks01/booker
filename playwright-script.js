const { chromium } = require('playwright');
const dotenv = require('dotenv');

dotenv.config();

const executablePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'

const date = new Date()
date.setDate(date.getDate() + 14)
const dateString = date.toLocaleDateString("sv", {timeZone: "Europe/London"})
console.log(dateString)

const courtIds = [
   'e93a1aa3-a7a8-41c1-81d6-b0f1e73d6ecd', //court 4
   '23e0b037-e9a6-491b-9598-f6d2743a71d8', //court 6
   //'253d6b6290c2-e609-482e-9934-e97f212e351f', //ct3
   //'33b36759-cfd9-4d29-9135-65107f91a524' // ct5
]

const weekdayPreferences = [
     1080, // 1080 / 60 = 18
     1020, // 17
     1140  // 19
];

const weekendPreferences = [
    
    720,
    780,
    840
];

const weekendDays = [6, 0];  // Saturday and Sunday
const preferences = weekendDays.includes(date.getDay()) ? weekendPreferences : weekdayPreferences;

(async () => {
    const browser = await chromium.launch({executablePath, headless: false})
    const context = await browser.newContext();
    const page = await context.newPage()

    await login(page)

    const sessions = await getSessions(page);

    let preference = null;
    let bothHourCourtIds = [];
    let firstHourCourtIds = [];
    let secondHourCourtIds = [];

    for (preference of preferences) {
        firstHourCourtIds = courtIds.filter(courtId => sessions.some(session => session.courtId === courtId && session.startTime === preference.toString(10)))
        // secondHourCourtIds = courtIds.filter(courtId => sessions.some(session => session.courtId === courtId && session.startTime === (preference + 60).toString(10)))
        // bothHourCourtIds = firstHourCourtIds.filter(firstHourCourtId => secondHourCourtIds.includes(firstHourCourtId))

        console.log(preference)
        console.log(firstHourCourtIds)
        // console.log(secondHourCourtIds)
        // console.log(bothHourCourtIds)

        if (!firstHourCourtIds.length) {
            console.log(`Insufficient sessions found for ${preference}`)
            continue
        }

        break
    }

    if (!firstHourCourtIds.length) {
        console.log("Insufficent sessions found");
        browser.close()
    }

    if (firstHourCourtIds.length) {
        console.log('Ready to book a single court')
        const firstSession = sessions.find(session => session.startTime === preference.toString() && session.courtId === firstHourCourtIds[0])
        await book(page, bookingPageUrl(firstHourCourtIds[0], dateString, firstSession.sessionId, preference, preference + 60))
    }
        // console.log('we have a double')
        // const session = sessions.find(session => session.startTime === preference.toString() && session.courtId === bothHourCourtIds[0])
        // await book(page, bookingPageUrl(bothHourCourtIds[0], dateString, session.sessionId, preference, preference + 120))
        // console.log("Double booked")
    // } 
    // else if (firstHourCourtIds.length && secondHourCourtIds.length) {
    //     console.log('going for two singles')
    //     const firstSession = sessions.find(session => session.startTime === preference.toString() && session.courtId === firstHourCourtIds[0])
    //     const secondSession = sessions.find(session => session.startTime === (preference + 60).toString() && session.courtId === secondHourCourtIds[0])
    //     await book(page, bookingPageUrl(firstHourCourtIds[0], dateString, firstSession.sessionId, preference, preference + 60))
    //     await book(page, bookingPageUrl(secondHourCourtIds[0], dateString, secondSession.sessionId, preference + 60, preference + 120))
    //     console.log("Two singles booked")
    // }

     browser.close()
})

const login = async page => {
    console.log('logging in')
    await page.goto('https://auth.clubspark.uk/account/signin?ReturnUrl=%2fissue%2fwsfed%3fwa%3dwsignin1.0%26wtrealm%3dhttps%253a%252f%252fstratford.newhamparkstennis.org.uk%26wctx%3drm%253d0%2526id%253d0%2526ru%253dhttps%25253a%25252f%25252fstratford.newhamparkstennis.org.uk%25252fBooking%25252fBookings%26wct%3d2023-09-20T20%253a12%253a59Z%26prealm%3dhttps%253a%252f%252fclubspark.lta.org.uk%252f%26proot%3dhttps%253a%252f%252fstratford.newhamparkstennis.org.uk%26paroot%3dhttps%253a%252f%252fstratford.newhamparkstennis.org.uk%26source%3dstratford_newhamparkstennis_org_uk%26name%3dStratford%2bPark%26nologo%3d0%26error%3dFalse%26message%3d&wa=wsignin1.0&wtrealm=https%3a%2f%2fstratford.newhamparkstennis.org.uk&wctx=rm%3d0%26id%3d0%26ru%3dhttps%253a%252f%252fstratford.newhamparkstennis.org.uk%252fBooking%252fBookings&wct=2023-09-20T20%3a12%3a59Z&prealm=https%3a%2f%2fclubspark.lta.org.uk%2f&proot=https%3a%2f%2fstratford.newhamparkstennis.org.uk&paroot=https%3a%2f%2fstratford.newhamparkstennis.org.uk&source=stratford_newhamparkstennis_org_uk&name=Stratford+Park&nologo=0&error=False&message=')
    // await page.goto('https://clubspark.lta.org.uk/FinsburyPark/Account/SignIn?returnUrl=%2FFinsburykPark%2FBooking%2FBookByDate')
    const ltaLoginSelector = '//*[@id="content"]/div[1]/div[2]/div[1]/div[2]/form/button'
    await page.locator(ltaLoginSelector).click();

    const usernameSelector = 'input[placeholder=Username]'
    await page.locator(usernameSelector).fill(process.env.LTA_USERNAME)

    const passwordSelector = 'input[placeholder=Password]'
    await page.locator(passwordSelector).fill(process.env.LTA_PASSWORD)

    const submitSelector = 'button[title=Login]'
    await page.locator(submitSelector).click()

    // click Make a booking button
    const bookingSelector = '//*[@id="my-bookings-view"]/div/div/div/div[2]/div/div/div/p/a'
    await page.locator(bookingSelector).click();

    const sessionsSelector = '.booking-sheet'
    return await page.waitForSelector(sessionsSelector)
}

const getSessions = async (page) =>  {
    console.log('looking for courts...')
    // const url = `https://clubspark.lta.org.uk/FinsburyPark/Booking/BookByDate#?date=${dateString}`;
    const url = `https://stratford.newhamparkstennis.org.uk/Booking/BookByDate#?date=${dateString}`;
    console.log(url)
    await page.goto(url);

    const sessionsSelector = '.booking-sheet';
    await page.waitForSelector(sessionsSelector);

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

    await delay(3000)

    const sessions = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[data-availability=true] .book-interval'))
            .map((node) => {
                const courtId = node.dataset.testId.split('booking-')[1].split('|')[0];
                const startTime = node.dataset.testId.split('|')[2];
                const sessionId = node.parentNode.parentNode.dataset.sessionId;
                return { courtId, startTime, sessionId };
            });
    });

    console.log(sessions);
    console.log(sessions.length)
    return sessions;
}

const book = async (page, url) => {

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    console.log('book')
    console.log(url)
    await page.goto(url)

    const confirmationButtonSelector = 'button#paynow'
    await page.locator(confirmationButtonSelector).click()

    await page.getByText('Card number').click();
    await page.frameLocator('iframe[title="Secure card number input frame"]').getByPlaceholder('1234 1234 1234 1234').fill(process.env.CC_NUMBER);
    await page.getByText('MM/YY').click();
    await page.frameLocator('iframe[title="Secure expiration date input frame"]').getByPlaceholder('MM / YY').fill(process.env.CC_EXPIRY);
    await page.getByText('CVC').click();
    await page.frameLocator('iframe[title="Secure CVC input frame"]').getByPlaceholder('CVC').fill(process.env.CC_CVC);
    await page.locator('button[type=submit]').click()

    return await page.waitForNavigation()
}

const bookingPageUrl = (courtId, date, sessionId, startTime, endTime) => {
    // return `https://clubspark.lta.org.uk/FinsburyPark/Booking/Book?` + 
    return `https://stratford.newhamparkstennis.org.uk/Booking/Book?` + 
    `Contacts%5B0%5D.IsPrimary=true&` + 
    `ResourceID=${courtId}&` +
    `Date=${date}&` +
    `SessionID=${sessionId}&` +
    `StartTime=${startTime.toString()}&` + 
    `EndTime=${endTime.toString()}`
}
