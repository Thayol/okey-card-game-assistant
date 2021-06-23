/* START OF CONFIG */

var maxNumber = 8; // the maximum number on cards (cards always start at one)
var colors = [ "red", "blue", "yellow" ]; // the available numbers
var handSize = (colors.length * 2) - 1; // the maximum hand size
var seriesLength = colors.length; // the minimum required length of series
var pointsMultiplier = 10; // useless "big number feel" multiplier

var sameNumberExtra = 1; // extra points given for sets of same numbers
var sameNumberFixed = false; // if this is true, "sameNumberExtra" will be constant instead of additive

var seriesExtra = 0; // extra points given for series
var seriesFixed = false; // if this is true, "seriesExtra" will be constant instead of additive

var sameColorExtra = 4; // extra points given for sets of the same color if they are in a series
var sameColorFixed = false; // if this is true, "sameColorExtra" will be constant instead of additive

var autoDraw = false; // whether the script should automatically draw on start and on discard
var autoRecommend = true; // whether the script should automatically recommend on change
var measurePerformance = false; // whether the performance should be logged into the console
var allowRedraw = true; // if redrawing a card by hand is allowed (sometimes the real game is bugged and will give dupes

var defaultDepth = 2; // the default depth of search (0 means single-level, 1 means one extra level, 2 means two extra levels)

var minimumRecommendations = 3; // the minimum amount of recommended next steps the script should strive for
var minimumPoints = 4; // the minimum points the script should consider cashing out
var preferCashOut = true; // whether the default option should be cashing out even if there is a chance of getting a better opportunity


// fixups (feel free to delete if not needed)
sameColorFixed = true; // for some reason the live game does not work like the wiki says
sameColorExtra = 10; // it gives 100 for 1-2-3* too

/* END OF CONFIG */



var allCards = undefined;
var deck = undefined;
var hand = undefined;
var globalPoints = undefined;
var recommendations = undefined;

var deckElement = document.getElementById('deck');
var handElement = document.getElementById('hand');
var recommendElement = document.getElementById('result');
var pointsElement = document.getElementById('points');

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
	if (card) {
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
		
		if (!forDeck) {
			if (recommendations.length > 0 ) {
				if (recommendations[0].burnedCard) {
					if (recommendations[0].burnedCard == card.id) {
						element.classList.add("discard");
					}
				}
				else if (recommendations[0].cards && recommendations[0].cards.includes(card.id)) {
					element.classList.add("select");
				}
			}
		}
		
		return element.outerHTML;
	}
	
	return "";
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

function discard(cardId, thisHand = null, update = true) {
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
	
	if (!handGiven && update) {
		updateUI();
	}
}

function cashOut(thisHand = null, recommendation = null, forceRefresh = true) {
	let localPoints = 0;
	
	if (recommendation == null) {
		if (recommendations.length > 0) {
			recommendation = recommendations[0];
		}
	}
	
	if (recommendation != null) {
		let handGiven = true;
		if (thisHand == null) {
			thisHand = hand;
			handGiven = false;
		}
		
		if (recommendation.burnedCard) {
			discard(recommendation.burnedCard, thisHand, false);
		}
		else if (recommendation.pattern && recommendation.cards) {
			localPoints = recommendation.points;
			
			localCards = [...recommendation.cards];
			
			// reset recommendations
			recommendations = [];
			
			for (let cardId of localCards) {
				discard(cardId, thisHand, false);
			}
			
			if (!handGiven) {
				globalPoints += localPoints;
			}
		}
	}
	
	if (forceRefresh) {
		updateUI();
	}
	
	return localPoints;
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
	
	if (!isHandFull(thisHand)) {
		let allowed = false;
		if (allowRedraw) {
			allowed = true;
		}
		else {
			if (thisDeck.includes(cardId)) {
				allowed = true;
			}
		}
		
		if (allowed) {
			thisDeck.splice(thisDeck.indexOf(cardId), 1);
			thisHand.push(cardId);
		
			if (!handGiven) {
				updateUI();
			}
		}
	}
}

function recommend() {
	var cardCount = Object.keys(allCards).length
	recommendOfDepth(defaultDepth);
	updateUI(true);
}

function getPatterns(thisHand = null, thisMinimumPoints = null) {
	if (thisHand == null) {
		thisHand = hand;
	}
	
	if (thisMinimumPoints == null) {
		thisMinimumPoints = minimumPoints;
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
		if (card) {
			cardColorsByNumbers[card.number - 1].push(card.color);
			cardsByNumbers[card.number - 1].push(card);
		}
	}
	
	// check if there are "color" amount of any
	for (let i = 0; i < maxNumber; i++) {
		if (cardsByNumbers[i].length >= colors.length) {
			let patternName = (i + 1).toString();
			for (let j = 1; j < colors.length; j++) {
				patternName += "-" + (i + 1).toString();
			}
			
			let cardIds = [];
			for (let card of cardsByNumbers[i]) {
				cardIds.push(cardToId(card));
			}
			
			// "i" is lagging behind, adjustment needed
			let points = (i + 1 + sameNumberExtra)
			if (sameNumberFixed) {
				points = sameNumberExtra;
			}
			
			patterns[patternName] = {};
			patterns[patternName].pattern = patternName;
			patterns[patternName].points = points;
			patterns[patternName].cards = cardIds;
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
			let sameColor = false;
			if (theseColors.length > 0) {
				sameColor = true;
			}
			
			let patternName = (i + 1).toString();
			for (let numberOffset = 1; numberOffset < seriesLength; numberOffset++) {
				patternName += "-" + (i + numberOffset + 1).toString();
			}
			
			// "i" is lagging behind, adjustment needed
			let points = (i + 1 + seriesExtra);
			if (seriesFixed) {
				points = seriesExtra;
			}
			
			if (sameColor) {
				if (sameColorFixed) {
					points = sameColorExtra;
				}
				else {
					points = ((i + 1) + sameColorExtra);
				}
				
				patternName += "*";
			}
			
			// try to regather the cards
			let allowedColors = theseColors;
			let gatheredCards = [];
			if (allowedColors.length < 1) {
				allowedColors = colors;
			}
			for (let numberOffset = 0; numberOffset < seriesLength; numberOffset++) {
				for (let card of cardsByNumbers[i + numberOffset]) {
					if (allowedColors.includes(card.color)) {
						gatheredCards.push(card.id);
						break;
					}
				}
			}
			
			patterns[patternName] = {};
			patterns[patternName].pattern = patternName;
			patterns[patternName].points = points;
			patterns[patternName].cards = gatheredCards;
		}
	}
	
	let points = Object.values(patterns).map(pattern => pattern.points);
	let maxPoints = Math.max(...points);
	
	if (maxPoints < thisMinimumPoints) {
		return [];
	}
	
	let selectedPatterns = Object.values(patterns).filter(pattern => pattern.points == maxPoints);
	
	return selectedPatterns;
}

function getHandPoints(hand = null) {
	let patterns = getPatterns(hand, 0);
	if (patterns.length > 0) {
		return patterns[0];
	}
	
	return { pattern: "none", points: 0 };
}

function recommendOfDepth(depth = 0) {
	if (measurePerformance) {
		var t0 = performance.now();
	}
	
	recommendations = [];
	recommendThrowaway(depth);
	let current = getHandPoints();
	if (current.points > 0) {
		let choice = {
			points: current,
			chance: 1,
			points: current.points,
			pattern: current.pattern,
			cards: current.cards
		};
		recommendations.unshift(choice);
	}
	
	if (!preferCashOut) {
		recommendations.sort((a, b) => {
			var place = 0
			if (a.chance > b.chance) {
				place -= 1;
			}
			else if (a.chance >= b.chance) {
				place += 1;
			}
			if (a.points > b.points) {
				place -= 10;
			}
			else {
				place += 10;
			}
			return place;
		});
	}
	
	if (measurePerformance) {
		var t1 = performance.now();
		console.log("Took " + (t1 - t0) + " milliseconds.");
	}
}

function recommendThrowaway(depth = 0, thisHand = null, thisDeck = null, chance = 1, firstDiscarded = null, pointsUntilNow = 0) {
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
			
			let burnedCard = newHand[i];
			if (firstDiscarded != null) {
				burnedCard = firstDiscarded;
			}
			
			choices.push({ burnedCard: burnedCard, index: i });
			
			newHand.splice(i, 1);
			newHand.push(newDeck[deckIndex]);
			newDeck.splice(deckIndex, 1);
			
			hands.push(newHand);
			decks.push(newDeck);
		}
	}
	
	for (let choice of choices) {
		let result = getHandPoints(hands[choice.index]);
		if (result.points > 0) {
			// choice.points = result.points;
			choice.points = cashOut(hands[choice.index], result, false);
			choice.pattern = result.pattern;
			choice.cards = result.cards;
			
			let thisChance = 1;
			if (thisDeck.length > 0) {
				thisChance = chance * (1/thisDeck.length);
			}
			
			choice.chance = thisChance
			
			recommendations.push(choice);
		}
	}
	
	// compress recommendations
	if (choices.length > 0) {
		// recommendations = [...new Set(recommendations)];
		
		// only allow one recommendation per pattern
		let newRecs = [];
		for (let rec of recommendations) {
			if (!newRecs.map(newRec => newRec.pattern).includes(rec.pattern)) {
				newRecs.push(rec);
			}
		}
	
		recommendations = newRecs;
	}
	
	for (let choice of choices) {
		if (!choice.points) {
			choice.points = 0;
		}
		choice.points += pointsUntilNow;
	}
	
	// recursive
	for (let choice of choices) {
		if (depth > 0 && recommendations.length < minimumRecommendations) {
			recommendThrowaway(depth - 1, hands[choice.index], decks[choice.index], choice.chance, choice.burnedCard, choice.points);
		}
	}
	
	if (firstDiscarded == null) {
		recommendations.sort((a, b) => {
			var place = 0
			if (a.chance > b.chance) {
				place -= 1;
			}
			else if (a.chance >= b.chance) {
				place += 1;
			}
			if (a.points > b.points) {
				place -= 10;
			}
			else {
				place += 10;
			}
			return place;
		});
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
		if (hand.length >= handSize) {
			recommend();
		}
		else {
			recommendations = [];
		}
	}
	recommendationArray = [];
	for (let recommendation of recommendations) {
		recommendationArray.push(getRecommendationText(recommendation));
	}
	recommendationArray = [...new Set(recommendationArray)];
	if (recommendationArray.length > 0) {
		recommendElement.innerHTML = recommendationArray.join("<br>");
	}
	else {
		recommendElement.innerHTML = "No recommendation.";
	}
	
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
	
	pointsElement.innerHTML = Math.floor(globalPoints * pointsMultiplier);
}

function reset() {
	globalPoints = 0;
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