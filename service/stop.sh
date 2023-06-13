#!/bin/bash

# 查找名为 'my_service' 的 screen 会话并终止它
screen -S my_service -X quit
echo "Stop service complete!"