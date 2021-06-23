{
    "targets": [
      {
        "target_name": "addon",
        "sources": [ "addon.cc" ],
        "cflags!": [ "-fno-exceptions" ],
        "cflags_cc!": [ "-fno-exceptions" ],
        "include_dirs" : [
          "<!@(node -p \"require('node-addon-api').include\")"
        ],
        'defines': [ 'NAPI_DISABLE_CPP_EXCEPTIONS' ],
        'conditions': [
          ['OS=="win"', {
            'defines': [
              'WIN32_LEAN_AND_MEAN'
            ],
            'link_settings': {
              'libraries': []
            },
          }],
          ['OS=="linux"', {
            'defines': [
              '_GNU_SOURCE'
            ],
            'link_settings': {
              'libraries': [
                '-lxcb', '-lpthread'
              ]
            },
            'cflags': ['-std=c99', '-pedantic', '-Wall', '-pthread'],
          }]
        ],
      }
    ]
  }