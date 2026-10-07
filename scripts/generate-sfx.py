"""Generate the original procedural RUNTIME sound-effects pack.

The sounds deliberately use only synthesis and deterministic noise so the
repository owns the complete, reproducible audio source.
"""

from pathlib import Path
import wave

import numpy as np


SAMPLE_RATE = 48_000
OUTPUT = Path(__file__).resolve().parents[1] / "public" / "audio" / "sfx"
RNG = np.random.default_rng(0xAAC65)


def time(duration: float) -> np.ndarray:
    return np.arange(int(SAMPLE_RATE * duration), dtype=np.float64) / SAMPLE_RATE


def envelope(duration: float, attack: float = .008, release: float = .08) -> np.ndarray:
    t = time(duration)
    attack_curve = np.minimum(1.0, t / max(attack, 1 / SAMPLE_RATE))
    release_curve = np.minimum(1.0, (duration - t) / max(release, 1 / SAMPLE_RATE))
    return np.clip(attack_curve * release_curve, 0, 1)


def sine_sweep(duration: float, start: float, end: float, curve: float = 1.0) -> np.ndarray:
    t = time(duration)
    progress = np.power(np.clip(t / duration, 0, 1), curve)
    frequency = start + (end - start) * progress
    phase = 2 * np.pi * np.cumsum(frequency) / SAMPLE_RATE
    return np.sin(phase)


def tone(duration: float, frequency: float) -> np.ndarray:
    return np.sin(2 * np.pi * frequency * time(duration))


def noise(duration: float) -> np.ndarray:
    return RNG.uniform(-1, 1, len(time(duration)))


def lowpass(signal: np.ndarray, cutoff: float) -> np.ndarray:
    alpha = 1 - np.exp(-2 * np.pi * cutoff / SAMPLE_RATE)
    output = np.empty_like(signal)
    current = 0.0
    for index, sample in enumerate(signal):
        current += alpha * (sample - current)
        output[index] = current
    return output


def highpass(signal: np.ndarray, cutoff: float) -> np.ndarray:
    return signal - lowpass(signal, cutoff)


def place(destination: np.ndarray, source: np.ndarray, start: float, gain: float = 1.0) -> None:
    offset = int(start * SAMPLE_RATE)
    end = min(len(destination), offset + len(source))
    if end > offset:
        destination[offset:end] += source[:end - offset] * gain


def pulse_train(duration: float, rate: float, duty: float = .35) -> np.ndarray:
    return ((time(duration) * rate) % 1.0 < duty).astype(np.float64)


def save(name: str, signal: np.ndarray, pan: float = 0.0) -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    signal = np.tanh(signal * 1.18)
    peak = max(float(np.max(np.abs(signal))), 1e-6)
    signal = signal / peak * .9
    left_gain = np.sqrt((1 - pan) / 2)
    right_gain = np.sqrt((1 + pan) / 2)
    delay = max(1, int(.0018 * SAMPLE_RATE))
    right = np.roll(signal, delay)
    right[:delay] = 0
    stereo = np.column_stack((signal * left_gain, right * right_gain))
    pcm = np.int16(np.clip(stereo, -1, 1) * 32767)
    with wave.open(str(OUTPUT / f"{name}.wav"), "wb") as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(pcm.tobytes())


def card_draw() -> np.ndarray:
    duration = .42
    air = highpass(noise(duration), 1200) * envelope(duration, .012, .13)
    sweep = sine_sweep(duration, 180, 920, .72) * envelope(duration, .018, .09)
    ticks = pulse_train(duration, 28, .07) * highpass(noise(duration), 2600)
    return air * .25 + sweep * .38 + ticks * envelope(duration, .01, .18) * .12


def card_select() -> np.ndarray:
    duration = .19
    first = tone(duration, 760) * np.exp(-time(duration) * 22)
    second = tone(duration, 1280) * np.exp(-np.maximum(time(duration) - .045, 0) * 30)
    gate = (time(duration) >= .045).astype(float)
    click = highpass(noise(duration), 3500) * np.exp(-time(duration) * 65)
    return first * .5 + second * gate * .28 + click * .16


def service_deploy() -> np.ndarray:
    duration = .78
    impact = sine_sweep(duration, 150, 48, .45) * np.exp(-time(duration) * 5.2)
    body = lowpass(noise(duration), 650) * np.exp(-time(duration) * 7)
    boot = sine_sweep(duration, 320, 1380, 1.5) * envelope(duration, .06, .18)
    return impact * .72 + body * .38 + boot * .22


def command_execute() -> np.ndarray:
    duration = .48
    result = np.zeros(len(time(duration)))
    for index, frequency in enumerate((680, 920, 1260, 1680)):
        beep = tone(.09, frequency) * envelope(.09, .003, .045)
        place(result, beep, index * .072, .42)
    data = highpass(noise(duration), 2300) * pulse_train(duration, 43, .12) * envelope(duration, .004, .11)
    return result + data * .16


def infrastructure_deploy() -> np.ndarray:
    duration = 1.04
    motor = (tone(duration, 58) + tone(duration, 91) * .42) * envelope(duration, .035, .23)
    servo = sine_sweep(duration, 210, 660, 1.7) * pulse_train(duration, 18, .62) * envelope(duration, .04, .16)
    clunk = sine_sweep(.35, 118, 42, .5) * np.exp(-time(.35) * 9)
    result = motor * .4 + servo * .24 + lowpass(noise(duration), 900) * envelope(duration, .02, .28) * .15
    place(result, clunk, .69, .85)
    return result


def damage_hit() -> np.ndarray:
    duration = .34
    crunch = highpass(noise(duration), 480) * np.exp(-time(duration) * 13)
    thump = sine_sweep(duration, 125, 52, .52) * np.exp(-time(duration) * 10)
    sparks = highpass(noise(duration), 3600) * pulse_train(duration, 31, .1) * envelope(duration, .001, .16)
    return crunch * .42 + thump * .7 + sparks * .13


def core_damage() -> np.ndarray:
    duration = .82
    sub = sine_sweep(duration, 105, 34, .5) * np.exp(-time(duration) * 4.4)
    alarm = sine_sweep(duration, 520, 310, 1.0) * pulse_train(duration, 7.5, .5) * envelope(duration, .01, .19)
    debris = lowpass(noise(duration), 1500) * np.exp(-time(duration) * 6)
    return sub * .9 + alarm * .24 + debris * .3


def patch_heal() -> np.ndarray:
    duration = .68
    result = np.zeros(len(time(duration)))
    for index, frequency in enumerate((440, 554.37, 659.25, 880)):
        note = tone(.25, frequency) * envelope(.25, .012, .12)
        place(result, note, index * .105, .34)
    shimmer = highpass(noise(duration), 4200) * envelope(duration, .05, .16)
    return result + shimmer * .08


def card_crash() -> np.ndarray:
    duration = .74
    t = time(duration)
    source = sine_sweep(duration, 470, 58, .7) + noise(duration) * .45
    held = source.copy()
    block = int(.012 * SAMPLE_RATE)
    for start in range(0, len(held), block):
        held[start:start + block] = held[start]
    gate = pulse_train(duration, 24 - 13 * (t / duration), .55)
    return held * gate * envelope(duration, .004, .2) * .58 + sine_sweep(duration, 180, 36, .6) * np.exp(-t * 5) * .48


def turn_start() -> np.ndarray:
    duration = .58
    result = np.zeros(len(time(duration)))
    for start, frequency, gain in ((0, 740, .46), (.12, 1110, .4), (.245, 1480, .34)):
        ping = tone(.28, frequency) * np.exp(-time(.28) * 12)
        place(result, ping, start, gain)
    return result


def ui_error() -> np.ndarray:
    duration = .36
    first = sine_sweep(.17, 330, 245) * envelope(.17, .004, .055)
    second = sine_sweep(.17, 270, 185) * envelope(.17, .004, .055)
    result = np.zeros(len(time(duration)))
    place(result, first, 0, .55)
    place(result, second, .18, .55)
    return result


def victory() -> np.ndarray:
    duration = 1.38
    result = np.zeros(len(time(duration)))
    for index, frequency in enumerate((440, 554.37, 659.25, 880, 1108.73)):
        note = (tone(.55, frequency) + tone(.55, frequency * 2) * .18) * envelope(.55, .015, .3)
        place(result, note, index * .155, .3)
    place(result, sine_sweep(.7, 90, 48) * np.exp(-time(.7) * 4), .55, .58)
    return result


def defeat() -> np.ndarray:
    duration = 1.28
    result = np.zeros(len(time(duration)))
    for index, frequency in enumerate((330, 277.18, 220, 164.81)):
        note = tone(.48, frequency) * envelope(.48, .012, .25)
        place(result, note, index * .19, .34)
    collapse = lowpass(noise(.72), 720) * np.exp(-time(.72) * 4.5)
    place(result, collapse, .48, .32)
    return result


def booster_open() -> np.ndarray:
    duration = .96
    foil = highpass(noise(duration), 1800) * envelope(duration, .018, .2)
    tear = foil * pulse_train(duration, 19, .22)
    release = sine_sweep(duration, 130, 880, 1.45) * envelope(duration, .12, .2)
    snap = sine_sweep(.24, 180, 52, .55) * np.exp(-time(.24) * 11)
    result = tear * .36 + release * .3
    place(result, snap, .67, .7)
    return result


def card_reveal() -> np.ndarray:
    duration = .42
    flip = highpass(noise(duration), 2100) * envelope(duration, .01, .14)
    ping = sine_sweep(duration, 540, 960, .8) * envelope(duration, .025, .16)
    return flip * .18 + ping * .38


def rare_reveal() -> np.ndarray:
    duration = .78
    result = card_reveal()
    output = np.zeros(len(time(duration)))
    place(output, result, 0, .75)
    for start, frequency in ((.16, 740), (.28, 932.33), (.4, 1110)):
        place(output, tone(.34, frequency) * envelope(.34, .012, .2), start, .27)
    return output


def legendary_reveal() -> np.ndarray:
    duration = 1.32
    result = np.zeros(len(time(duration)))
    rise = sine_sweep(duration, 170, 1320, 1.5) * envelope(duration, .08, .3)
    shimmer = highpass(noise(duration), 4800) * envelope(duration, .1, .32)
    impact = sine_sweep(.72, 98, 38, .48) * np.exp(-time(.72) * 4.5)
    result += rise * .28 + shimmer * .1
    place(result, impact, .46, .75)
    for start, frequency in ((.5, 440), (.59, 659.25), (.68, 880), (.77, 1108.73)):
        place(result, tone(.5, frequency) * envelope(.5, .01, .3), start, .23)
    return result


SOUNDS = {
    "card-draw": card_draw,
    "card-select": card_select,
    "service-deploy": service_deploy,
    "command-execute": command_execute,
    "infrastructure-deploy": infrastructure_deploy,
    "damage-hit": damage_hit,
    "core-damage": core_damage,
    "patch-heal": patch_heal,
    "card-crash": card_crash,
    "turn-start": turn_start,
    "ui-error": ui_error,
    "victory": victory,
    "defeat": defeat,
    "booster-open": booster_open,
    "card-reveal": card_reveal,
    "rare-reveal": rare_reveal,
    "legendary-reveal": legendary_reveal,
}


if __name__ == "__main__":
    for filename, factory in SOUNDS.items():
        save(filename, factory())
        print(f"generated {filename}.wav")
