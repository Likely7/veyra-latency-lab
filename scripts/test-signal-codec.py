import unittest
from signal_codec import crc8,decode_frame_code

class FrameCodeTests(unittest.TestCase):
    def test_published_crc_check_vector(self):
        self.assertEqual(crc8(b'123456789'),0xf4)
        self.assertEqual(crc8(bytes([0,1])),0x07)

    def test_golden_frames_and_all_single_bit_corruptions(self):
        zero='1010'+'0000000000000000'+'00000000'+'0101'
        one='1010'+'0000000000000001'+'00000111'+'0101'
        self.assertEqual(decode_frame_code(zero),0)
        self.assertEqual(decode_frame_code(one),1)
        for index in range(32):
            altered=one[:index]+('0' if one[index]=='1' else '1')+one[index+1:]
            self.assertIsNone(decode_frame_code(altered),f'Accepted corrupted bit {index}')
        self.assertIsNone(decode_frame_code(one[:-1]))
        self.assertIsNone(decode_frame_code('x'*32))

if __name__=='__main__': unittest.main()
