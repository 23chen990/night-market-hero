import Phaser from 'phaser';
import config from './generated/game-config.json';
import './style.css';

type State = { version: 1; currency: number; level: number; inventory: number; customerWaiting: boolean; randomSeed: number };
const saveKey = `ai-game-factory:${config.title}`;
const initial = (): State => ({ version: 1, currency: config.balance.startingCurrency, level: 1, inventory: 0, customerWaiting: true, randomSeed: 1 });
let state: State = load();
function load(): State { try { const value = JSON.parse(localStorage.getItem(saveKey) ?? 'null'); return value?.version === 1 ? value : initial(); } catch { return initial(); } }
function save() { localStorage.setItem(saveKey, JSON.stringify(state)); renderHud(); }
function renderHud() {
  document.querySelector('#title')!.textContent = config.title;
  document.querySelector('#coins')!.textContent = `${config.content.currencyName}: ${state.currency}`;
  document.querySelector('#level')!.textContent = `摊位等级: ${state.level}`;
  document.querySelector('#status')!.textContent = state.customerWaiting ? `${config.content.customerName}正在等待${config.content.productName}` : '摊位暂时清闲';
  (document.querySelector('#deliver') as HTMLButtonElement).disabled = !state.customerWaiting || state.inventory < 1;
  (document.querySelector('#upgrade') as HTMLButtonElement).disabled = state.currency < upgradeCost();
}
function upgradeCost() { return config.balance.baseUpgradeCost * state.level; }
function resetGame() { localStorage.removeItem(saveKey); state = initial(); save(); return getState(); }
function getState() { return structuredClone(state); }
function spawnCustomer() { state.customerWaiting = true; save(); return getState(); }
function produce() { state.inventory += 1; save(); return getState(); }
function completeOrder() { if (state.customerWaiting && state.inventory > 0) { state.inventory -= 1; state.customerWaiting = false; state.currency += config.balance.orderReward * state.level; save(); } return getState(); }
function grantCurrency(amount = 10) { state.currency += Math.max(0, Math.floor(amount)); save(); return getState(); }
function upgradeStation() { const cost = upgradeCost(); if (state.currency >= cost) { state.currency -= cost; state.level += 1; save(); } return getState(); }
function setRandomSeed(seed: number) { state.randomSeed = seed >>> 0; save(); return getState(); }

declare global { interface Window { __GAME_TEST__: { resetGame: typeof resetGame; getState: typeof getState; spawnCustomer: typeof spawnCustomer; completeOrder: typeof completeOrder; grantCurrency: typeof grantCurrency; upgradeStation: typeof upgradeStation; setRandomSeed: typeof setRandomSeed } } }
window.__GAME_TEST__ = { resetGame, getState, spawnCustomer, completeOrder, grantCurrency, upgradeStation, setRandomSeed };
document.querySelector('#produce')!.addEventListener('click', produce); document.querySelector('#deliver')!.addEventListener('click', completeOrder); document.querySelector('#upgrade')!.addEventListener('click', upgradeStation);

class MarketScene extends Phaser.Scene {
  constructor() { super('market'); }
  preload() { this.load.image('background', config.assets.background); this.load.image('customer', config.assets.customer); this.load.image('product', config.assets.product); }
  create() {
    this.add.image(480, 270, 'background').setDisplaySize(960, 540).setAlpha(0.55);
    this.add.rectangle(480, 390, 700, 170, Number.parseInt(config.palette[1].slice(1), 16), 0.9).setStrokeStyle(4, 0xffffff, 0.4);
    this.add.image(270, 270, 'customer').setDisplaySize(190, 190); this.add.image(680, 340, 'product').setDisplaySize(120, 120);
    this.add.text(480, 86, config.theme, { fontFamily: 'sans-serif', fontSize: '32px', color: '#ffffff', stroke: '#000000', strokeThickness: 5 }).setOrigin(0.5);
  }
}
new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: 960, height: 540, backgroundColor: config.palette[0], scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: [MarketScene] });
renderHud();
