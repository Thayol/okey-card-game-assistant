var deck = {};
var hand = {};

var deckElement = document.getElementById('deck');
var handElement = document.getElementById('hand');

var colors = [ "red", "blue", "yellow" ];
var handSize = 5;
var maxNumber = 8;

fillDeck();
updateUI();

function cardToId(card) {
	return card.color + "_" + card.number.toString();
}

function cardToElement(card, forDeck = false) {
	var element = document.createElement("okey-card");
	element.innerHTML = card.number.toString();
	
	if (forDeck) {
		element.setAttribute("onclick", "drawCard('" + cardToId(card) + "')");
		if (isHandFull()) {
			element.setAttribute("hand-full", "");
		}
	}
	else {
		element.setAttribute("onclick", "discard('" + cardToId(card) + "')");
	}
	
	if (forDeck && card.drawn) {
		element.classList.add("drawn-" + card.color);
	}
	else {
		element.classList.add(card.color);
		element.setAttribute("clickable", "");
	}
	
	return element.outerHTML;
}

function isHandFull() {
	return Object.entries(hand).length >= handSize;
}

function fillDeck() {
	for (let color of colors)
	{
		for (let i = 1; i <= maxNumber; i++)
		{
			let card = {
				color: color,
				number: i,
				drawn: false
			};
			
			deck[cardToId(card)] = card;
		}
	}
}

function discard(cardId) {
	delete hand[cardId];
	updateUI();
}

function drawCard(cardId) {
	if (!deck[cardId].drawn && !isHandFull()) {
		hand[cardId] = deck[cardId];
		deck[cardId].drawn = true;
		updateUI();
	}
}

function getPatterns(thisHand = null) {
	if (thisHand == null) {
		thisHand = hand;
	}
	
	let patterns = [];
	
	for (let i = 1; i <= maxNumber; i++) {
		sameNumber = 0;
		for (let card of Object.values(thisHand)) {
			if (card.number == i) {
				sameNumber++;
			}
		}
		
		if (sameNumber >= colors.length) {
			let patternName = i + "-" + i + "-" + i;
			patterns[patternName] = (i + 1) * 10;
		}
	}
	
	console.log(Object.keys(patterns));
	
	patterns = patterns.sort((a,b) => (a.last_nom > b.last_nom) ? -1 : ((b.last_nom > a.last_nom) ? 1 : 0));
	
	return Object.keys(patterns);
}

function updateUI() {
	handElement.innerHTML = "";
	for (let card of Object.values(hand)) {
		handElement.innerHTML += cardToElement(card);
	}
	
	deckElement.innerHTML = "";
	for (let card of Object.values(deck)) {
		deckElement.innerHTML += cardToElement(card, true);
	}
}

function reset() {
	deck = {};
	hand = {};
	fillDeck();
	updateUI();
}