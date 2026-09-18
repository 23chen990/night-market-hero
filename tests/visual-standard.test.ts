import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
const rendererSource = await readFile(new URL('../src/night-city-renderer.ts', import.meta.url), 'utf8');

describe('ui-f-night-market-interior visual standard', () => {
  test('locks a landscape minimal-flat shell with token-only left and destination-plus-pause right corners', () => {
    assert.match(html, /data-visual-standard="ui-f-night-market-interior"/);
    assert.match(html, /data-character-reference-sha256="adb2a97b3f72d9233aa807a3f7833d4f2633c6e3210b570750ded32c04f2c3eb"/);
    assert.match(html, /data-orientation="LANDSCAPE_16_9"/);
    assert.match(html, /data-rendering="MINIMAL_FLAT_2D"/);
    assert.match(html, /data-hub="hub-money-shell"/);
    assert.match(html, /data-hub="hub-money-value"/);
    assert.match(html, /class="sr-only" data-ui="wishfire"/);
    assert.match(html, /data-hub="hub-gate-strip"[^>]*>[\s\S]*data-ui="destination"/);
    assert.match(html, /class="pause-button"[^>]*data-action="pause"/);
    assert.doesNotMatch(html, /class="brand-lockup"|class="instruction"/);
    assert.doesNotMatch(css, /STKaiti|KaiTi|ornate/);
    assert.doesNotMatch(css, /(?:linear|radial)-gradient/);
  });

  test('uses a readable guard at the phone-left edge as the primary pursuit expression', () => {
    assert.match(html, /data-ui="pursuer"[^>]*data-primary-expression="visible-guard-silhouette"/);
    assert.match(html, /data-character-identity="strict-reference"/);
    assert.match(html, /data-pose="compact-low-running"/);
    assert.match(html, /data-weapon="short-low-held"/);
    assert.match(html, /data-face="none"/);
    assert.match(html, /data-ui="left-edge-alert"/);
    assert.match(html, /data-ui="pursuer-label"[^>]*>官兵/);
  });

  test('draws strict-reference silhouettes without readable skin or facial features', () => {
    assert.match(mainSource, /drawStrictReferenceProtagonist/);
    assert.match(mainSource, /drawStrictReferencePursuer/);
    assert.match(mainSource, /CHARACTER_BLUE_BLACK/);
    assert.match(mainSource, /VERMILION_SCARF/);
    assert.match(mainSource, /COPPER_WAIST_ACCENT/);
    assert.match(mainSource, /VERMILION_HEADBAND/);
    assert.match(mainSource, /drawShortLowHeldWeapon/);
    assert.doesNotMatch(mainSource, /0xeadbc8|readableFace|skinTone/);
    assert.doesNotMatch(mainSource, /fillCircle\(x - 5, y - 4|fillCircle\(x \+ 5, y - 4/);
  });

  test('renders the patrol from formal pursuer world coordinates', () => {
    assert.match(mainSource, /const patrolX = state\.pursuer\.x;/);
    assert.match(mainSource, /const patrolY = state\.pursuer\.y;/);
    assert.doesNotMatch(mainSource, /const patrolX = state\.player\.x - state\.chase\.distance;/);
  });

  test('does not reintroduce the retired neutral or floating decoration path', () => {
    assert.doesNotMatch(mainSource, /drawCoveredNightMarketInterior/);
    assert.doesNotMatch(mainSource, /level1-parallax-far|level1-parallax-mid/);
    assert.match(mainSource, /__NIGHT_MARKET_HERO_TAPTAP_AD_CONFIG__/);
    assert.doesNotMatch(mainSource, /drawRooftop|__LANTERN|屋脊/);
    assert.doesNotMatch(mainSource, /\b(?:moon|mountains?|skyline)\b/i);
  });

  test('keeps approved minimal-flat character identity over image-backed city plates', () => {
    assert.match(mainSource, /createNightCityRenderer/);
    assert.match(mainSource, /nightCityRenderer\.render/);
    assert.match(rendererSource, /market-panorama-v1\.png/);
    assert.match(rendererSource, /rooftops-panorama-v1\.png/);
    assert.match(rendererSource, /waterfront-panorama-v1\.png/);
    assert.match(rendererSource, /foreground-eaves-v1\.png/);
    assert.match(rendererSource, /depth:\s*-20/);
    assert.match(mainSource, /CHARACTER_BLUE_BLACK/);
    assert.match(mainSource, /VERMILION_SCARF/);
    assert.match(mainSource, /VERMILION_HEADBAND/);
  });

  test('renders the restored lashed bamboo states and keeps shutter drawing on collision geometry', () => {
    assert.match(mainSource, /lashed-bamboo-scaffold/);
    assert.match(mainSource, /behaviorState === 'strained'/);
    assert.match(mainSource, /behaviorState === 'broken'/);
    assert.doesNotMatch(mainSource, /impactShift/);
    assert.match(mainSource, /const occupied = obstacle\.occupiedBounds/);
    assert.match(mainSource, /fillRect\(occupied\.x, occupied\.y, occupied\.width, occupied\.height\)/);
  });

  test('draws the inner market gate from vertical top/bottom leaf bounds only', () => {
    assert.match(mainSource, /gate\.renderTopLeafBounds/);
    assert.match(mainSource, /gate\.renderBottomLeafBounds/);
    assert.match(mainSource, /gate\.collisionAperture/);
  });

  test('keeps the center clear and makes grapple guidance contextual instead of persistent', () => {
    assert.match(html, /data-persistent-tutorial="false"/);
    assert.doesNotMatch(html, /class="encounter-readout"/);
    assert.match(mainSource, /routeHint\.dataset\.visible/);
    assert.match(css, /\.route-hint\[data-visible="false"\]/);
  });

  test('does not add gameplay actions beyond the existing grapple hold surface', () => {
    const gameplayActions = [...html.matchAll(/data-gameplay-action="([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(gameplayActions, ['grapple-hold-release']);
    assert.doesNotMatch(html, /data-action="(?:attack|jump|dash|grapple-press|grapple-release)"/);
  });

  test('routes every HUD, menu, overlay, icon, and state transition through the UI motion contract', () => {
    assert.match(html, /id="app"[^>]*data-ui-preload="pending"[^>]*data-ui-state-motion="state-change"/);
    assert.match(html, /class="corner-hud[^>]*data-ui-motion="hud-enter"/);
    assert.match(html, /data-hub="hub-back-key"[^>]*data-ui-motion="icon-press"/);
    assert.match(html, /class="pause-button"[^>]*data-ui-motion="icon-press"/);
    assert.match(html, /data-ui="result"[^>]*data-ui-motion="menu-enter"/);
    for (const ui of ['threat-vignette', 'escape-feedback', 'climax']) {
      assert.match(html, new RegExp(`data-ui="${ui}"[^>]*data-ui-motion="overlay-feedback"`));
    }
    assert.match(html, /class="route-hint[^>]*data-ui-motion="overlay-feedback"/);
    assert.doesNotMatch(css, /transition:[^;]*\blinear\b/);
    assert.match(mainSource, /createUiAnimationRuntime/);
    assert.match(mainSource, /requestAnimationFrame/);
    assert.match(mainSource, /uiMotion\.preload/);
  });
});
