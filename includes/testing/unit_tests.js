const path = require('path');
const test = require('unit.js')
const Evaluate = require(path.join(__dirname, '..' , 'poker_client', 'Evaluate.js'))
const Deck = require(path.join(__dirname, '..' , 'poker_client', 'Deck.js'))
const Player = require(path.join(__dirname, '..' , 'poker_client', 'Player.js'))
let evaluator = new Evaluate();


describe('Player Tests', function() {

    it('Test Constructor', function () {
    let p1 = new Player(1234, "leadouttom", 1000) 
 
 test.assert.equal(p1.getCards().length, 0,"Array not Empty")       
 test.assert.equal(p1.getUserId(), 1234,"User ID incorrect")   
 test.assert.equal(p1.getUsername(), "leadouttom","Username incorrect")  
 test.assert.equal(p1.getTableBalance(), 1000,"Table Balance incorrect")  
 test.assert.equal(p1.getAmountWagered(), 0,"Amount Wagered incorrect")   
 test.assert.equal(p1.getAmountWageredRound(), 0,"Amount Wagered incorrect")   
 test.assert.equal(p1.getShownCards().length, 0,"Array not Empty") 
 test.assert.equal(p1.getActed(), false,"Acted value incorrect")   
})
    it('Set Method Tests', function () {
        let p1 = new Player(1234, "leadouttom", 1000) 
        p1.initialiseTableBalance(1001)
        test.assert.equal(p1.getTableBalance(), 1001,"getTableBalance incorrect")  
        p1.adjustTableBalance(-1);
        test.assert.equal(p1.getTableBalance(), 1000,"AdjustTableBalance incorrect") 
        test.assert.equal(p1.takeChips(100), 100,"TakeChips incorrect") 
        test.assert.equal(p1.getTableBalance(), 900,"TakeChips incorrect") 
        p1.setUserId(4321)
        test.assert.equal(p1.getUserId(), 4321,"SetUserId incorrect") 
        p1.setUserSid(100)
        test.assert.equal(p1.getUserSid(), 100,"SetUserSid incorrect") 

        test.assert.equal(p1.getAmountWagered(), 100,"AmountWagered incorrect") 
        test.assert.equal(p1.getAmountWageredRound(), 100,"AmountWageredRound incorrect") 
        p1.changeAmountWagered(100)
        p1.changeAmountWageredRound(100)
        test.assert.equal(p1.getAmountWagered(), 200,"AmountWagered incorrect") 
        test.assert.equal(p1.getAmountWageredRound(), 200,"AmountWageredRound incorrect")
        p1.resetAmountWagered()
        p1.resetAmountWageredRound()
        test.assert.equal(p1.getAmountWagered(), 0,"AmountWagered incorrect") 
        test.assert.equal(p1.getAmountWageredRound(), 0,"AmountWageredRound incorrect")
        p1.playerActed()
        p1.getTableBalance()
        test.assert.equal(p1.getActed(), true,"Acted value incorrect")   
        p1.addCard({ 'suit': 'Diamonds', 'value' : '14'})
        p1.addCard({ 'suit': 'Spades', 'value' : '14'});
        test.assert.equal(p1.getCards().length, 2,"Cards not added")   
    })
    it('Get Method Tests', function () {
        let p1 = new Player(1234, "leadouttom", 1000) 
        p1.fold(true);
        test.assert.equal(p1.getFolded(), true,"GetFolded incorrect")
        test.assert.equal(p1.isAllin(), false,"GetAllin incorrect")
        p1.addCard({ 'suit': 'Diamonds', 'value' : '14'})
        p1.addCard({ 'suit': 'Spades', 'value' : '14'});
        p1.fold(true);
        test.assert.equal(p1.getCards().length, 0,"Array not Empty") 
    })
    it('Game Related Tests', function () {
        let p1 = new Player(1234, "leadouttom", 1000) 
        p1.addCard({ 'suit': 'Diamonds', 'value' : '14'})
        p1.addCard({ 'suit': 'Spades', 'value' : '14'});
        p1.fold(true);
        test.assert.equal(p1.getCards().length, 0,"Array not Empty") 
        p1.fold(false)
        p1.addCard({ 'suit': 'Diamonds', 'value' : '14'})
        p1.addCard({ 'suit': 'Spades', 'value' : '14'});
        p1.showCards()
        test.assert.equal(p1.getShownCards().length, 2,"Array != 2") 
        p1.clearShownCards()
        test.assert.equal(p1.getShownCards().length, 0,"Array not Empty") 
    })

})

describe('Deck Tests', function() {

    it('Test Constructor', function () {
    let deck = new Deck();
   
 test.assert.equal(deck.get_deck().length, 0,"Array not Empty")       
 test.assert.equal(deck.get_dealtcards().length, 0,"Array not Empty")       
  
})
it('Test Generate', function () {
    let deck = new Deck();
    deck.generate_deck();
 test.assert.equal(deck.get_deck().length, 52,"Array incorrect")       
 test.assert.equal(deck.get_dealtcards().length, 0,"Array not Empty")       
  
})
it('Test functions', function () {
    let deck = new Deck();
    deck.generate_deck();
    let poppedcard = deck.pop_card();
    test.assert.equal(poppedcard["suit"], "Diamonds","Incorrect card popped")
    test.assert.equal(poppedcard["value"], "14","Incorrect card popped")        
    test.assert.equal(deck.get_dealtcards().length, 1,"Array incorrect")
    let flop = deck.deal_flop()
    test.assert.equal(deck.get_dealtcards().length, 5,"Array incorrect")
    test.assert.equal(flop.length, 3,"Array incorrect")

    let turn = deck.deal_turnriver()
    test.assert.equal(deck.get_dealtcards().length, 7,"Array incorrect")

})
it('Test shuffle', function () {
    let deck = new Deck();
    deck.generate_deck();
    deck.shuffle_deck();
    test.assert.equal(deck.get_deck().length, 52,"Array incorrect")       
    test.assert.equal(deck.get_dealtcards().length, 0,"Array not Empty")       

})
})

describe('Evaluator Tests', function() {

    it('Test Evaluator', function () {
let p1 = new Player(1234, "leadouttom", 1000) 
p1.addCard({ 'suit': 'Diamonds', 'value' : '14'})
p1.addCard({ 'suit': 'Spades', 'value' : '14'});
let p2 = new Player()
p2.setUserId(1235)
p2.addCard({ 'suit': 'Clubs', 'value' : '11'})
p2.addCard({ 'suit': 'Hearts', 'value' : '10'});
let p3 = new Player()
p3.setUserId(1236)
p3.addCard({ 'suit': 'Clubs', 'value' : '2'})
p3.addCard({ 'suit': 'Diamonds', 'value' : '14'});
let p4 = new Player()
p4.setUserId(1236)
p4.addCard({ 'suit': 'Clubs', 'value' : '11'})
p4.addCard({ 'suit': 'Spades', 'value' : '14'});
let p5 = new Player()
p5.setUserId(1236)
p5.addCard({ 'suit': 'Diamonds', 'value' : '2'})
p5.addCard({ 'suit': 'Spades', 'value' : '10'});
let p6 = new Player()
p6.setUserId(1236)
p6.addCard({ 'suit': 'Clubs', 'value' : '14'})
p6.addCard({ 'suit': 'Spades', 'value' : '10'});
let p7 = new Player()
p7.setUserId(1236)
p7.addCard({ 'suit': 'Clubs', 'value' : '10'})
p7.addCard({ 'suit': 'Spades', 'value' : '2'});
let p8 = new Player()
p8.setUserId(1236)
p8.addCard({ 'suit': 'Clubs', 'value' : '13'})
p8.addCard({ 'suit': 'Spades', 'value' : '4'});
let p9 = new Player()
p9.setUserId(1236)
p9.addCard({ 'suit': 'Clubs', 'value' : '4'})
p9.addCard({ 'suit': 'Spades', 'value' : '3'});

let testseat1 = {
	1: p1,
	2: p2,
	3: p3,
	4: p4,
	5: p5,
	6: p6,
	7:p7,
	8: p8,
	9: p9
};
let testboard1 = [{ 'suit': 'Diamonds', 'value' : '10'}, { 'suit': 'Diamonds', 'value' : '13'}, { 'suit': 'Diamonds', 'value' : '11'}, { 'suit': 'Diamonds', 'value' : '11'}, { 'suit': 'Spades', 'value' : '11'}];
     let expectedreturn = [[ '4' ],[ '2' ],[ '1' ],[ '8' ],[ '5', '6', '7' ],[ '3' ],[ '9' ]]     
let finish = evaluator.Evaluate(testseat1, testboard1)
     test.assert(finish, expectedreturn, "Expected return incorrect")
    })

})

