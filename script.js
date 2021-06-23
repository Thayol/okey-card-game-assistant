var maxNumber = 8; // the maximum number on cards (cards always start at one)
var colors = [ "red", "blue", "yellow" ]; // the available numbers
var handSize = (colors.length * 2) - 1; // the maximum hand size
var seriesLength = colors.length; // the minimum required length of series
var pointsMultiplier = 10; // useless "big number feel" multiplier
var sameNumberExtra = 1; // extra points given for sets of same numbers
var sameColorExtra = 4; // extra points given for sets of the same color if they are in a series

var autoDraw = false; // whether the script should automatically draw on start and on discard
var autoRecommend = true; // whether the script should automatically recommend on change
var measurePerformance = false; // whether the performance should be logged into the console

var allCards = undefined;
var deck = undefined;
var hand = undefined;
var globalPoints = undefined;
var recommendations = undefined;
var minimumRecommendations = 1;

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

function cashOut(thisHand = null) {
	if (recommendations.length > 0) {
		let handGiven = true;
		if (thisHand == null) {
			thisHand = hand;
			handGiven = false;
		}
		
		// console.log("Recommendation: ");
		// console.log(recommendations[0]);
		
		if (recommendations[0].burnedCard) {
			// console.log("Discarding: " + recommendations[0].burnedCard);
			discard(recommendations[0].burnedCard, thisHand, false);
		}
		else if (recommendations[0].pattern && recommendations[0].cards) {
			let localPoints = recommendations[0].points;
			
			let localCards = [...recommendations[0].cards];
			
			// reset recommendations
			recommendations = [];
			
			for (let cardId of localCards) {
				// console.log("Redeeming: " + cardId);
				discard(cardId, thisHand, false);
			}
			
			globalPoints += localPoints;
			// console.log("Cashed out: " + (localPoints * pointsMultiplier) + " points");
		}
		
		if (!handGiven) {
			updateUI();
		}
	}
	else {
		// console.log("Nothing to do.");
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
	
		if (!handGiven) {
			updateUI();
		}
	}
}

function recommend() {
	var cardCount = Object.keys(allCards).length
	recommendOfDepth(6);
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
			
			let cardIds = [];
			for (let card of cardsByNumbers[i]) {
				cardIds.push(cardToId(card));
			}
			
			// "i" is lagging behind, adjustment needed
			let points = (i + 1 + sameNumberExtra)
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
			let points = (i + 1);
			
			if (sameColor) {
				points = ((i + 1) + sameColorExtra);
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
	
	let selectedPatterns = Object.values(patterns).filter(pattern => pattern.points == maxPoints);
	
	return selectedPatterns;
}

function getHandPoints(hand = null) {
	let patterns = getPatterns(hand);
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
	
	if (measurePerformance) {
		var t1 = performance.now();
		console.log("Took " + (t1 - t0) + " milliseconds.");
	}
}

function recommendThrowaway(depth = 0, thisHand = null, thisDeck = null, chance = 1, firstDiscarded = null) {
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
			choice.points = result.points;
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
		recommendations = [...new Set(recommendations)];
		
		// only allow one recommendation per pattern
		let newRecs = [];
		for (let rec of recommendations) {
			if (!newRecs.map(newRec => newRec.pattern).includes(rec.pattern)) {
				newRecs.push(rec);
			}
		}
	
		recommendations = newRecs;
	}
	
	// recursive
	for (let choice of choices) {	
		if (depth > 0 && recommendations.length < minimumRecommendations) {
			recommendThrowaway(depth - 1, hands[choice.index], decks[choice.index], choice.chance, choice.burnedCard);
		}
	}
	
	if (firstDiscarded == null) {
		recommendations.sort((a, b) => {
			var place = 0
			if (a.chance > b.chance) {
				place -= 10;
			}
			else if (a.chance >= b.chance) {
				place += 10;
			}
			if (a.points > b.points) {
				place += 1;
			}
			else {
				place -= 1;
			}
			return place;
		});
		// let fewer = recommendations.filter(choice => choice.chance >= 0.01);
		// if (fewer.length > 0) {
			// recommendations = fewer;
		// }
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
			// recommendations = [];
		}
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