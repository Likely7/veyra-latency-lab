"""Veyra frame16 + CRC-8/SMBUS visual strip (detection only, not correction)."""
SCHEME = 'veyra-frame16-crc8-v1'
GEOMETRY = {'scheme': SCHEME, 'x': 65, 'y': 638, 'cellSize': 26, 'pitch': 34, 'cells': 32,
            'prefix': '1010', 'suffix': '0101', 'frameBits': 16,
            'crc': 'CRC-8/SMBUS', 'polynomial': '0x07', 'init': '0x00', 'byteOrder': 'big-endian'}

def crc8(data):
    result = 0
    for byte in data:
        result ^= byte
        for _ in range(8):
            result = ((result << 1) ^ (0x07 if result & 0x80 else 0)) & 0xff
    return result

def balanced_sum(items):
    if not items: return '0'
    if len(items) == 1: return items[0]
    half = len(items) // 2
    return '(' + balanced_sum(items[:half]) + '+' + balanced_sum(items[half:]) + ')'

def bit_expressions():
    # CRC is linear over GF(2). A parity expression for each CRC bit avoids
    # timers, per-frame image generation, and enormous nested CRC expressions.
    bits = list(GEOMETRY['prefix'])
    bits += [f'mod(floor(n/{1 << shift}),2)' for shift in range(15, -1, -1)]
    for output in range(7, -1, -1):
        terms = [f'mod(floor(n/{1 << source}),2)' for source in range(16)
                 if crc8((1 << source).to_bytes(2, 'big')) & (1 << output)]
        bits.append(f'mod({balanced_sum(terms)},2)')
    return bits + list(GEOMETRY['suffix'])

assert crc8(b'123456789') == 0xf4  # Published CRC-8/SMBUS check vector.

def decode_frame_code(bits):
    """Return a frame number, or None for a malformed/CRC-invalid observation."""
    if len(bits) != 32 or any(bit not in '01' for bit in bits): return None
    if bits[:4] != '1010' or bits[-4:] != '0101': return None
    frame = int(bits[4:20], 2)
    return frame if int(bits[20:28], 2) == crc8(frame.to_bytes(2,'big')) else None
