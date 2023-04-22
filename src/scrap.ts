import fs from 'fs';
import puppeteer from 'puppeteer';

const dir = './icons';

const MUI_ICONS_URL = 'https://mui.com/material-ui/material-icons/?theme=';
const REACT_ICONS_BASE_URL = 'https://react-icons.github.io';
const HOME_SLUG = '/react-icons';
const iconPageSlugs: string[] = ['mui'];

/**
 * Get the url of a react-icons page
 *
 * @param string slug
 * @returns
 */
const getUrl = (slug: string) => REACT_ICONS_BASE_URL + slug;

/**
 * Get the url of a mui page
 *
 * @param string slug
 * @returns
 */
const getMuiUrl = (variant: string) => MUI_ICONS_URL + variant;
const findSlug = (str: string) => {
    const slug = str.replace(/^\/react-icons\/icons\?name=([\S]+)$/g, '$1');
    if (!slug) {
        throw new Error('Invalid slug: ' + slug);
    }
    return slug;
};

const queryPageElements = async (
    url: string,
    selector: string,
    callback: (el: any, page: any) => void,
    waitFor: string | null = null
) => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(url);
        await page.waitForSelector(waitFor ?? selector);

        const elements = await page.$$(selector);

        for (const el of Array.from(elements)) {
            await callback(el, page);
        }

        await browser.close();
    } catch (error) {
        console.log(error);
    }
};

const createFileStructure = (slugs: string[]): void => {
    console.log(slugs);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    for (const slug of slugs) {
        if (!fs.existsSync(dir + '/' + slug)) {
            fs.mkdirSync(dir + '/' + slug);
        }
    }
};

const writeIconFile = (slug: string, name: string, icon: string): void => {
    fs.appendFile(`icons/${slug}/${name}.svg`, icon, (err):void => {
        if (err) throw err;
    });
};

const scrapReactIcons = async (slug: string, slugUrl: string) => {
    await queryPageElements(
        getUrl(slugUrl),
        'div.icons > .item',
        async (el) => {
            let iconEl = await el.$('svg');
            let i = 0;
            while (!(iconEl = await el.$('svg')) && i < 10) {
                console.log('svg does not exist for slug ' + slug);
                await new Promise((resolve) => setTimeout(resolve, 1000));
                i++;
            }
            const icon = await iconEl.evaluate((element: any) => element.outerHTML);
            const nameEl = await el.$('.name');
            const name = await nameEl.evaluate((element: any) => element.innerText);
            writeIconFile(slug, name, icon);
        },
        'div.icons > .item svg'
    );
};

const scrapMaterialDesignIcons = async () => {
    const variants: string[] = [];

    await queryPageElements(
        MUI_ICONS_URL,
        '#main-content > div:nth-child(6) > div:nth-child(2) > div > div:nth-child(1) input[type="radio"]',
        async (el) => {
            const variant = await el.evaluate((element: any) => element.value);
            variants.push(variant.replace(/\s+/g, '+'));
        },
        null
    );

    for (const variant of variants) {
        await queryPageElements(
            getMuiUrl(variant),
            '#main-content > div:nth-child(6) > div:nth-child(2) > div > div:nth-child(2) > div:nth-child(3) > span',
            async (el) => {
                const iconEl = await el.$('svg');
                const icon = await iconEl.evaluate((element: any) => element.outerHTML);
                const nameEl = await el.$('div div');
                const name = await nameEl.evaluate((element: any) => element.innerText);
                writeIconFile('mui', 'Mui' + name, icon);
            },
            '#main-content > div:nth-child(6) > div:nth-child(2) > div > div:nth-child(2) > div:nth-child(3) > span svg'
        );
    }
};

const main = async () => {
    console.time('query icons');
    await queryPageElements(getUrl(HOME_SLUG), '#__next ul li a', async (el) => {
        const hrefHandle = await el.getProperty('href');
        const slug: string = (await hrefHandle.jsonValue()).replace(REACT_ICONS_BASE_URL, '');
        if (slug === HOME_SLUG) return;

        if (!/^\/react-icons\/icons\?name=[\S]+$/.test(slug)) {
            throw new Error('Invalid slug: ' + slug);
        }

        iconPageSlugs.push(slug);
    });

    createFileStructure(iconPageSlugs.map((slug) => findSlug(slug)));

    let i = 0;
    for (const slugUrl of iconPageSlugs) {
        console.log(++i + ' / ' + iconPageSlugs.length);
        const slug = findSlug(slugUrl);
        if (slug === 'mui') {
            await scrapMaterialDesignIcons();
        } else {
            await scrapReactIcons(slug, slugUrl);
        }
    }

    console.timeEnd('query icons');
};

main();
