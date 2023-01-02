import {
    Chapter,
    ChapterDetails,
    ContentRating,
    HomeSection,
    HomeSectionType,
    LanguageCode,
    Manga,
    MangaStatus,
    PagedResults,
    SearchRequest,
    Source,
    SourceInfo,
} from "paperback-extensions-common";

let BASE_URL = 'https://www.asurascans.com/';

export let AsuraScansInfo: SourceInfo = {
    version: "1.0.0",
    name: "AsuraScans",
    icon: "icon.png",
    author: "hanqinilnix",
    authorWebsite: "https://github.com/hanqinilnix",
    description: "Paperback Extension for AsuraScans",
    contentRating: ContentRating.EVERYONE,
    websiteBaseURL: BASE_URL,
};

export class AsuraScans extends Source {
    requestManager = createRequestManager({
        requestsPerSecond: 2,
        requestTimeout: 10000,
    });

    override async getMangaDetails(mangaId: string): Promise<Manga> {
        let request = createRequestObject({
            url: mangaId,
            method: 'GET',
        });

        let response = await this.requestManager.schedule(request, 1);
        let $ = this.cheerio.load(response.data);

        let titles: string[] = [];
        titles.push($('.entry-title').text()!)

        let statusString = $('.imptdt > i').text()!;
        let status: MangaStatus;
        switch (statusString) {
            case 'Ongoing':
                status = MangaStatus.ONGOING;
                break;
            case 'Completed':
                status = MangaStatus.COMPLETED;
                break;
            case 'Hiatus':
                status = MangaStatus.HIATUS;
                break;
            case 'Dropped':
                status = MangaStatus.ABANDONED;
                break;
            case 'Coming Soon':
                status = MangaStatus.UNKNOWN;
                break;
            default:
                status = MangaStatus.ONGOING;
        }

        let image = $('.thumb > img').attr('src')!.trim();

        let rating = $('.num').text()!.trim();

        let details = $('.fmed > span').toArray()
            .map(detail => $(detail).text().trim());

        let description = $('p').toArray()
            .map(desc => $(desc).text().trim())
            .slice(0, -1)
            .join('\n');

        return createManga({
            id: mangaId,
            titles: titles,
            image: image,
            rating: +rating,
            status: status,

            artist: details[1],
            author: details[2],

            desc: description,
            // follows: , 
            // tags: ,
            lastUpdate: new Date(details[6]!),
        });
    }

    override async getChapters(mangaId: string): Promise<Chapter[]> {
        let request = createRequestObject({
            url: mangaId,
            method: 'GET',
        });

        let response = await this.requestManager.schedule(request, 1);
        let $ = this.cheerio.load(response.data);

        let getChapterNumber = function (chapterNumber: string): number {
            return +(chapterNumber.split(' ')[0]!)
        };

        return $('div#chapterlist > ul > li').toArray()
            .map(chapter => createChapter({
                id: $(chapter).find('a').attr('href')!.trim(),
                mangaId: mangaId,
                chapNum: getChapterNumber($(chapter).attr('data-num')!.trim()),
                name: $(chapter).find('.chapternum').text()!.trim(),
                langCode: LanguageCode.ENGLISH,
                time: new Date($(chapter).find('.chapterdate').text()!.trim()),
            }));
    }

    override async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        let request = createRequestObject({
            url: chapterId,
            method: 'GET',
        });

        let response = await this.requestManager.schedule(request, 1);
        let $ = this.cheerio.load(response.data);

        let images = $('img').toArray()
            .map(img => $(img).attr('src')!)
            .slice(2, -3);

        return createChapterDetails({
            id: chapterId,
            longStrip: true,
            mangaId: mangaId,
            pages: images,
        });
    }

    override async getSearchResults(searchQuery: SearchRequest, metadata: any): Promise<PagedResults> {
        let request = createRequestObject({
            url: `${BASE_URL}?s=${searchQuery.title!}`,
            method: 'GET',
        });

        let response = await this.requestManager.schedule(request, 1);
        let $ = this.cheerio.load(response.data);

        let pageResults = $('.bs').toArray()
            .map(result => createMangaTile({
                id: $(result).find('a').attr('href')!.trim(),
                title: createIconText({ text: $(result).find('a').attr('title')!.trim() }),
                image: $(result).find('img').attr('src')!.trim(),
            }));

        return createPagedResults({
            results: pageResults,
        });
    }

    override getMangaShareUrl(mangaId: string): string {
        return mangaId;
    }

    override async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        let request = createRequestObject({
            url: BASE_URL,
            method: 'GET',
        });

        let response = await this.requestManager.schedule(request, 1);
        let $ = this.cheerio.load(response.data);

        let featuredSection = createHomeSection({
            id: '0',
            title: 'Featured',
            view_more: true,
            type: HomeSectionType.featured,
        });
        sectionCallback(featuredSection);
        featuredSection.items = $('.slide-item').toArray()
            .map(manga => createMangaTile({
                id: $(manga).find('a').attr('href')!.trim(),
                title: createIconText({ text: $(manga).find('.ellipsis').text()!.trim() }),
                image: $(manga).find('img').attr('src')!.trim()
            }));
        sectionCallback(featuredSection);

        // Popular Today
        let popularTodaySection = createHomeSection({
            id: '1',
            title: 'Popular Today',
            view_more: true,
            type: HomeSectionType.singleRowNormal,
        });
        sectionCallback(popularTodaySection);
        popularTodaySection.items = $('.bixbox > div > div.bs').toArray()
        .map(manga => createMangaTile({
            id: $(manga).find('a').attr('href')!.trim(),
            title: createIconText({ text: $(manga).find('a').attr('title')!.trim(), }),
            image: $(manga).find('img').attr('src')!.trim(), 
        }));
        sectionCallback(popularTodaySection);
        // Popular Weekly
        // Popular Monthly
        // Popular All Time
        // Latest Update
        let lastestUpdateSection = createHomeSection({
            id: '1',
            title: 'Popular Today',
            view_more: true,
            type: HomeSectionType.singleRowNormal,
        });
        sectionCallback(lastestUpdateSection);
        lastestUpdateSection.items = $('.bixbox > div > div.utao').toArray()
        .map(manga => createMangaTile({
            id: $(manga).find('a').attr('href')!.trim(),
            title: createIconText({ text: $(manga).find('a').attr('title')!.trim(), }),
            image: $(manga).find('img').attr('src')!.trim(), 
        }));
        sectionCallback(lastestUpdateSection);
    }

}
