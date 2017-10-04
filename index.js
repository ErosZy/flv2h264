const EventEmitter = require('events').EventEmitter;
const isBrowser = require('is-in-browser').default;
const FLVDemux = require('flv-demux');

const UNIT_MASK = Buffer.from([0x00, 0x00, 0x00, 0x01]);

if (isBrowser) {
  window.Buffer = window.Buffer || require('buffer/').Buffer;
}

class FLV2H264 extends EventEmitter {
  constructor() {
    super();
    this.lengthSizeMinusOne = -1;
    this.demux = new FLVDemux.Decoder();
    this.demux.on('tag', this.tagHandler.bind(this));
  }

  decode(buffer) {
    this.demux.decode(buffer);
  }

  tagHandler(tag) {
    if (tag.type == FLVDemux.DataTag.TYPE) {
      this.emit('mediaInfo', tag.data);
    } else if (tag.type == FLVDemux.AudioTag.TYPE) {
      this.emit('audio:nalus', {
        type: 'audio',
        size: tag.size,
        timestamp: tag.timestamp,
        soundFormat: tag.data.soundFormat,
        soundRate: tag.data.soundRate,
        soundSize: tag.data.soundSize,
        soundType: tag.data.soundType,
        data: tag.data.data,
        count: -1
      });
    } else if (tag.type == FLVDemux.VideoTag.TYPE) {
      let params = {
        size: tag.size,
        timestamp: tag.timestamp,
        frameType: tag.data.frameType,
        frameType: tag.data.codecId,
        frameType: tag.data.compositionTime
      };

      if (tag.data.AVCPacketType == 0) {
        let unit = tag.data.data;
        let configurationVersion = unit.readUInt8(0);
        let AVCProfileIndication = unit.readUInt8(1);
        let profileCompatibility = unit.readUInt8(2);
        let AVCLevelIndication = unit.readUInt8(3);
        this.lengthSizeMinusOne = (unit.readUInt8(4) & 3) + 1;

        let numOfSequenceParameterSets = unit.readUInt8(5) & 0x1f;
        let sequenceParameterSetLength = unit.readUInt16BE(6);
        let sps = unit.slice(8, 8 + sequenceParameterSetLength);
        let numOfPictureParameterSets = unit.readUInt8(
          8 + sequenceParameterSetLength
        );
        let pictureParameterSetLength = unit.readUInt16BE(
          8 + sequenceParameterSetLength + 1
        );
        let pps = unit.slice(
          8 + sequenceParameterSetLength + 3,
          8 + sequenceParameterSetLength + 3 + pictureParameterSetLength
        );

        this.emit(
          'video:nalus',
          Object.assign(
            {
              type: 'sps',
              count: 1,
              data: Buffer.concat([UNIT_MASK, sps])
            },
            params
          )
        );

        this.emit(
          'video:nalus',
          Object.assign(
            {
              type: 'pps',
              count: 1,
              data: Buffer.concat([UNIT_MASK, pps])
            },
            params
          )
        );
      } else if (tag.data.AVCPacketType == 1) {
        let size = tag.size - 5;
        let unit = tag.data.data;
        let nalus = [];
        while (size) {
          let naluLen = this.readBufferSize(unit, 0);
          let nalu = unit.slice(
            this.lengthSizeMinusOne,
            this.lengthSizeMinusOne + naluLen
          );
          nalus.push(UNIT_MASK, nalu);
          unit = unit.slice(this.lengthSizeMinusOne + naluLen);
          size -= this.lengthSizeMinusOne + naluLen;
        }

        this.emit(
          'video:nalus',
          Object.assign(
            {
              type: 'video',
              count: nalus.length,
              data: Buffer.concat(nalus)
            },
            params
          )
        );
      } else if (tag.data.AVCPacketType == 2) {
        this.emit('video:complete');
      }
    }
  }

  readBufferSize(buffer, offset) {
    let lengthSizeMinusOne = this.lengthSizeMinusOne;
    let results = 0;
    for (let i = 0; i < lengthSizeMinusOne; i++) {
      results |= buffer[offset + i] << ((lengthSizeMinusOne - 1 - i) * 8);
    }

    return results;
  }

  destroy() {
    this.demux.destroy();
    this.demux = null;
    this.removeAllListeners();
  }
}

module.exports = FLV2H264;
