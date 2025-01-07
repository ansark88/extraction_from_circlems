const services = [
	{
		service: "melonbooks",
		domain: "melonbooks.co.jp",
		cicrle_string: "circle_id",
	},
	{ service: "pixiv", domain: "pixiv.net", cicrle_string: "users" },
	{ service: "pixiv", domain: "pixiv.net", cicrle_string: "member.php" },
	{ service: "twitter", domain: "twitter.com", cicrle_string: "" },
	{ service: "x", domain: "x.com", cicrle_string: "" },
	{ service: "dlsite", domain: "dlsite.com", cicrle_string: "maker_id" },
	{ service: "fanza", domain: "dmm.co.jp", cicrle_string: "article=maker" },
];

// 対象ページからlinkを抜き出す関数(string型である必要がある)
const extractLinks = `(function() {
    const links = Array.from(document.getElementsByClassName('item')[0].getElementsByTagName('a'));

    // arrのどれかにtargetがマッチすればTrue
    // ref: https://qiita.com/mtoutside/items/e34e06c674a8e6623ba4
    const isIncludes = (arr, target) => arr.some(el => target.includes(el));

    // 抽出対象のホスト
    const services = [
        'melonbooks.co.jp',
        'dmm.co.jp',
        'dlsite.com',
        'x.com',
        'twitter.com',
        'pixiv.net'
    ];

    return links
      .filter(link => {
        try {
          const url = new URL(link.href);
          return isIncludes(services,url.hostname);
        } catch (e) {
          console.log(e);
          return false;
        }
      })
      .map(link => ({
        href: link.href,
        text: link.textContent.trim()
      }));
  })();`;

// circle.msじゃなければNG
const isCircleMS = `(function() {
    return location.href.includes("circle.ms")
  })();`;

// サークル名を抜き出す
const extractCircleName = `(function() {
    const el = document.getElementsByClassName('item')[0].querySelector("table.md-itemtable:nth-child(1) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > a:nth-child(1)")
    return el.text
  })();`;

// リンクの中でサークル情報に対するリンクのとき、サービス情報を付与する(それ以外のリンクは後でfilterする)
const enrichCircleLinks = (link) => {
	for (const service of services) {
		const url = new URL(link.href);
		if (
			url.hostname.includes(service.domain) &&
			link.href.includes(service.cicrle_string)
		) {
			link.service = service.service;
			return link;
		}
	}

	return null;
};

document.getElementById("extract").addEventListener("click", async () => {
	let errMessage = "";
	let circleName = "";
	const resultsDiv = document.getElementById("results");
	const resultArea = document.getElementById("result_area");
	resultsDiv.innerHTML = "";
	resultArea.value = "";

	// 今開いているページがCircle.msかどうかだけ判定する関数を実行する
	errMessage = await browser.tabs
		.executeScript({
			code: isCircleMS,
		})
		.then((results) => {
			if (!results[0]) {
				return "circle.msで実行してください";
			}
		})
		.catch((error) => {
			console.error("Error:", error);
			return "エラーが発生しました。";
		});

	if (errMessage) {
		resultsDiv.innerHTML = errMessage;
		return;
	} 
	errMessage = "";

	// サークル名を取得する関数を実行する
	errMessage = await browser.tabs
		.executeScript({
			code: extractCircleName,
		})
		.then((results) => {
			if (!results[0]) {
				return "サークル名を取得できませんでした";
			}

			circleName = results[0];
		})
		.catch((error) => {
			console.error("Error:", error);
			return "エラーが発生しました。";
		});

	if (errMessage) {
		resultsDiv.innerHTML = errMessage;
		return;
	} 
	errMessage = "";

	browser.tabs
		.executeScript({
			code: extractLinks,
		})
		.then((results) => {
			const links = results[0]
				.map(enrichCircleLinks)
				.filter((link) => link !== null);

			if (links.length === 0) {
				resultsDiv.innerHTML = "該当するリンクが見つかりませんでした。";
				return;
			}

			const circle_info = {
				name: circleName,
				links: links,
			};

			const result_json = JSON.stringify(circle_info);
			resultArea.value = result_json;

			for (const link of links) {
				const linkDiv = document.createElement("div");
				linkDiv.className = "link-item";

				const anchor = document.createElement("a");
				anchor.href = link.href;
				anchor.textContent = link.text || link.href;
				anchor.target = "_blank";

				linkDiv.appendChild(anchor);
				resultsDiv.appendChild(linkDiv);
			}
		})
		.catch((error) => {
			console.error("Error:", error);
			document.getElementById("results").innerHTML = "エラーが発生しました。";
		});
});

document.getElementById("copy").addEventListener("click", () => {
	const el = document.getElementById("result_area");
	navigator.clipboard.writeText(el.value);
});
