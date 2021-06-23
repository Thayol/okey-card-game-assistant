var maxNumber = 8; // the maximum number on cards (cards always start at one)
var colors = [ "red", "blue", "yellow" ]; // the available numbers
var handSize = (colors.length * 2) - 1; // the maximum hand size
var seriesLength = colors.length; // the minimum required length of series
var pointsMultiplier = 10; // useless "big number feel" multiplier
var sameNumberExtra = 1; // extra points given for sets of same numbers
var sameColorExtra = 4; // extra points given for sets of the same color if they are in a series

var autoDraw = false; // whether the script should automatically draw on start and on discard
var autoRecommend = true; // whether the script should automatically recommend on change

var allCards = undefined;
var deck = undefined;
var hand = undefined;
var recommendations = undefined;

var deckElement = document.getElementById('deck');
var handElement = document.getElementById('hand');
var recommendElement = document.getElementById('result');

reset();

function toggleAutoDraw(element) {
	if (element.checked) {
		autoDraw = true;
		fillHand();
	}
	else {
		autoDraw = false;
	}
}

function cardToId(card) {
	return card.color + "_" + card.number.toString();
}

function idToCard(cardId) {
	return allCards[cardId];
}

function cardToElement(card, forDeck = false, drawn = false) {
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
	
	if (forDeck && drawn) {
		element.classList.add("drawn-" + card.color);
	}
	else {
		element.classList.add(card.color);
		element.setAttribute("clickable", "");
	}
	
	return element.outerHTML;
}

function isHandFull(thisHand = null) {
	if (thisHand == null) {
		thisHand = hand;
	}
	
	return Object.entries(hand).length >= handSize;
}

function generateCards() {
	for (let color of colors)
	{
		for (let i = 1; i <= maxNumber; i++)
		{
			let card = {
				color: color,
				number: i
			};
			card.id = cardToId(card);
			
			allCards[card.id] = card;
		}
	}
}

function fillDeck() {
	for (let cardId of Object.keys(allCards)) {
		deck.push(cardId);
	}
}

function fillHand() {
	let draws = handSize - hand.length;
	for (let i = 0; i < draws; i++) {
		let deckPos = Math.floor(Math.random()*deck.length);
		drawCard(deck[deckPos]);
	}
}

function discard(cardId, thisHand = null) {
	let handGiven = true;
	if (thisHand == null) {
		thisHand = hand;
		handGiven = false;
	}
	
	if (thisHand.indexOf(cardId) !== -1) {
		thisHand.splice(thisHand.indexOf(cardId), 1);
	}
	
	if (autoDraw) {
		fillHand();
	}
	
	if (!handGiven) {
		updateUI();
	}
}

function drawCard(cardId, thisHand = null, thisDeck = null) {
	let handGiven = true;
	if (thisHand == null) {
		thisHand = hand;
		handGiven = false;
	}
	
	if (thisDeck == null) {
		thisDeck = deck;
		handGiven = false;
	}
	
	if (!isHandFull(thisHand) && thisDeck.includes(cardId)) {
		thisDeck.splice(thisDeck.indexOf(cardId), 1);
		thisHand.push(cardId);
	}
	
	if (!handGiven) {
		updateUI();
	}
}

function recommend() {
	recommendOfDepth();
	updateUI(true);
}

function getPatterns(thisHand = null) {
	if (thisHand == null) {
		thisHand = hand;
	}
	
	let patterns = {};
	
	cardsByNumbers = [];
	cardColorsByNumbers = [];
	
	// set up empty arrays for each number
	for (let i = 0; i < maxNumber; i++) {
		cardsByNumbers.push([]);
		cardColorsByNumbers.push([]);
	}
	
	// fill them with the current hand's cards
	for (let cardId of thisHand) {
		let card = idToCard(cardId);
		cardColorsByNumbers[card.number - 1].push(card.color);
		cardsByNumbers[card.number - 1].push(card);
	}
	
	// check if there are "color" amount of any
	for (let i = 0; i < maxNumber; i++) {
		if (cardsByNumbers[i].length >= colors.length) {
			let patternName = (i + 1).toString();
			for (let j = 1; j < colors.length; j++) {
				patternName += "-" + (i + 1).toString();
			}
			
			// "i" is lagging behind, adjustment needed
			let points = (i + 1 + sameNumberExtra)
			patterns[patternName] = {};
			patterns[patternName].pattern = patternName;
			patterns[patternName].points = points;
		}
	}
	
	// check if there are series present
	for (let i = 0; i <= (maxNumber - seriesLength); i++) {
		let isSeries = true;
		let theseColors = colors;
		for (let numberOffset = 0; numberOffset < seriesLength; numberOffset++) {
			if (cardColorsByNumbers[i + numberOffset] < 1) {
				isSeries = false;
				break;
			}
			
			// intersect
			theseColors = [theseColors, cardColorsByNumbers[i + numberOffset]].reduce((a, c) => a.filter(i => c.includes(i)));
		}
		
		if (isSeries) {
			let patternName = (i + 1).toString();
			for (let numberOffset = 1; numberOffset < seriesLength; numberOffset++) {
				patternName += "-" + (i + numberOffset + 1).toString();
			}
			
			// "i" is lagging behind, adjustment needed
			let points = (i + 1);
			
			// check if they are of the same color
			if (theseColors.length > 0) {
				points = ((i + 1) + sameColorExtra);
				patternName += "*";
			}
			
			patterns[patternName] = {};
			patterns[patternName].pattern = patternName;
			patterns[patternName].points = points;
		}
	}
	
	let points = Object.values(patterns).map(pattern => pattern.points);
	let maxPoints = Math.max(...points);
	
	let selectedPatterns = Object.values(patterns).filter(pattern => pattern.points == maxPoints);
	
	return selectedPatterns;
}

function getHandPoints(hand = null) {
	let patterns = getPatterns(hand);
	if (patterns.length > 0) {
		return patterns[0].points;
	}	
	
	return 0;
}

function recommendOfDepth(depth = 4) {
	var t0 = performance.now();
	
	recommendations = [];
	recommendThrowaway(depth);
	let current = getHandPoints();
	if (current > 0) {
		let choice = {
			burnedCard: "CASH OUT",
			points: current,
			chance: 1
		};
		recommendations.unshift(choice);
	}
	
	var t1 = performance.now();
	console.log("Took " + (t1 - t0) + " milliseconds.");
}

function recommendThrowaway(depth = 0, thisHand = null, thisDeck = null, chance = 1, startingFunction = true) {
	if (thisHand == null) {
		thisHand = hand;
	}
	
	if (thisDeck == null) {
		thisDeck = deck;
	}
	
	if (Object.keys(thisHand).length < 1) {
		return [0, "nothing", 0];
	}
	
	let decks = [];
	let hands = [];
	let choices = [];
	
	let loopDuration = Math.min(handSize, thisHand.length);
	
	for (let i = 0; i < loopDuration; i++) {
		for (let deckIndex = 0; deckIndex < thisDeck.length; deckIndex++) {
			let newHand = [...thisHand];
			let newDeck = [...thisDeck];
			
			choices.push({ burnedCard: newHand[i], index: i });
			
			newHand.splice(i, 1);
			newHand.push(newDeck[deckIndex]);
			newDeck.splice(deckIndex, 1);
			
			hands.push(newHand);
			decks.push(newDeck);
		}
	}
	
	if (startingFunction) {
		console.log(choices);
		for (let choice of choices) {
			let points = getHandPoints(hands[choice.index]);
			if (points > 0) {
				choice.points = points;
				
				let thisChance = 1;
				if (thisDeck.length > 0) {
					thisChance = chance * (1/thisDeck.length);
				}
				
				choice.chance = thisChance
				recommendations.push(choice);
			}
		}
	}
}

function getRecommendationText(rec) {
	if (Object.keys(allCards).includes(rec.burnedCard)) {
		return "Burn <b><u>" + 
			rec.burnedCard.replace("_", " ") + 
			"</u></b> and earn potentially " + 
			(rec.points * pointsMultiplier) + 
			" points. (" + 
			(rec.chance * 100).toFixed(2) + 
			"% chance)";
	}
	return "<b><u>Cash out</u></b> and get " + 
		(rec.points * pointsMultiplier) + 
		" points instantly!";
}

function updateUI(skipAuto = false) {
	if (autoRecommend && !skipAuto) {
		recommend();
	}
	recommendationArray = [];
	for (let recommendation of recommendations) {
		recommendationArray.push(getRecommendationText(recommendation));
		
	}
	recommendationArray = [...new Set(recommendationArray)];
	recommendElement.innerHTML = recommendationArray.join("<br>");
	
	handElement.innerHTML = "";
	for (let cardId of hand) {
		let card = idToCard(cardId);
		handElement.innerHTML += cardToElement(card);
	}
	
	deckElement.innerHTML = "";
	for (let cardId of Object.keys(allCards)) {
		let card = idToCard(cardId);
		if (deck.includes(cardId)) {
			deckElement.innerHTML += cardToElement(card, true);
		}
		else {
			deckElement.innerHTML += cardToElement(card, true, true);
		}
	}
}

function reset() {
	allCards = {};
	deck = [];
	hand = [];
	recommendations = [];
	generateCards();
	fillDeck();
	if (autoDraw) {
		fillHand();
	}
	updateUI();
}