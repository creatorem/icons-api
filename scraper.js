const cheerio = require("cheerio");
const axios = require("axios");

const baseUrl = "https://react-icons.github.io";
const homeSlug = "/react-icons";
const iconPageSlugs = [];

const getUrl = (slug) => baseUrl + slug;

const request = async (slug) =>
  await axios.request({
    method: "GET",
    url: getUrl(slug),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
    },
  });

const waitMenuIsLoaded = async (page) => {
  while (page("#__next").length === 0) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
};
const waitIconsAreLoaded = async (page) => {
  while (page(".icons .icon svg").length === 0) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
};

const getPage = async () => {
  const axiosResponse = await request(homeSlug);
  const $ = cheerio.load(axiosResponse.data);
  await waitMenuIsLoaded($);

  for (const el of $("#__next ul li a")) {
    const slug = $(el).attr("href");
    if (slug === homeSlug) continue;

    if (!/^\/react-icons\/icons\?name=[\S]+$/.test(slug)) {
      throw new Error("Invalid slug: " + slug);
    }

    iconPageSlugs.push(slug);
  }
};

const scrapIcons = async (slug) => {
  console.log(slug);
  const axiosResponse = await request(slug);
  console.log( axiosResponse.data )
  const $ = cheerio.load(axiosResponse.data);
  await waitMenuIsLoaded($);
  const icons = [];

  console.log($(".icons .icon svg"));
  console.log("length here");
  console.log($(".icons .icon svg").length);
  for (const el of $(".icons .icon svg")) {
    icons.push(el.outerHTML);
  }
  console.log(icons);
};

const main = async () => {
  await getPage();
  await scrapIcons(iconPageSlugs[0]);
};

main();
