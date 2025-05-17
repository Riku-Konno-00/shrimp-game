class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.score = 0;
        this.hp = 3;
        this.level = 1;
        this.objects = [];
        this.isGameRunning = false;

        // キャンバスの基本サイズ
        this.baseWidth = 800;
        this.baseHeight = 600;
        
        // レベルアップの設定
        this.baseScoreForLevel = 1000;
        this.lastLevelScore = 0;

        // 現在のスケール値を保持
        this.currentScale = 1;
        // 基本速度の設定
        this.baseSpeed = {
            min: 6,
            max: 9
        };
        
        // 移動距離の設定を追加
        this.moveDistance = {
            small: { min: 0.1, max: 0.8 }, // 小さい画面: 10%～80%
            large: { min: 0.1, max: 0.7 }  // 大きい画面: 10%～70%
        };
        
        // キャンバスのリサイズ処理を設定
        this.resizeCanvas();
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.adjustObjectsPosition();
        });

        // 画像の読み込み
        this.images = {
            shrimp: new Image(),
            goldenShrimp: new Image(),
            bomb: new Image(),
            octopus: new Image()
        };

        this.images.shrimp.src = './images/shrimp1.png';
        this.images.goldenShrimp.src = './images/shrimp2.png';
        this.images.bomb.src = './images/shrimp3.png';
        this.images.octopus.src = './images/oct1.png';

        // 画像の読み込み完了を待つ
        Promise.all([
            new Promise(resolve => this.images.shrimp.onload = resolve),
            new Promise(resolve => this.images.goldenShrimp.onload = resolve),
            new Promise(resolve => this.images.bomb.onload = resolve),
            new Promise(resolve => this.images.octopus.onload = resolve)
        ]).then(() => {
            // イベントリスナーの設定
            this.canvas.addEventListener('click', this.handleClick.bind(this));
            this.canvas.addEventListener('touchstart', this.handleTouch.bind(this), { passive: false });

            // スコア要素
            this.scoreElement = document.getElementById('score');
            this.hpElement = document.getElementById('hp');
            this.levelElement = document.getElementById('level');

            // UI要素
            this.startScreen = document.getElementById('startScreen');
            this.startButton = document.getElementById('startButton');
            this.countdownElement = document.getElementById('countdown');
            this.countdownNumber = this.countdownElement.querySelector('.countdown-number');
            this.gameOverModal = document.getElementById('gameOverModal');
            
            // 完了モーダルの作成
            this.completionModal = document.createElement('div');
            this.completionModal.className = 'overlay';
            this.completionModal.style.display = 'none';
            this.completionModal.innerHTML = `
                <div class="modal-content completion">
                    <h2>お疲れさまでした！</h2>
                    <p>スコア: <span id="completionScore">0</span></p>
                    <p>レベル: <span id="completionLevel">1</span></p>
                    <button id="completionRestartButton" class="game-button">もう一度プレイ</button>
                </div>
            `;
            document.querySelector('.game-container').appendChild(this.completionModal);
            
            this.completionScoreElement = document.getElementById('completionScore');
            this.completionLevelElement = document.getElementById('completionLevel');
            this.completionRestartButton = document.getElementById('completionRestartButton');
            
            this.restartButton = document.getElementById('restartButton');
            this.finalScoreElement = document.getElementById('finalScore');
            this.finalLevelElement = document.getElementById('finalLevel');

            // やめるボタンの設定
            this.quitButton = document.createElement('button');
            this.quitButton.className = 'quit-button';
            this.quitButton.textContent = 'やめる';
            this.quitButton.addEventListener('click', () => this.quitGame());
            document.querySelector('.game-container').appendChild(this.quitButton);

            // ボタンイベントの設定
            this.startButton.addEventListener('click', () => this.startCountdown());
            this.restartButton.addEventListener('click', () => this.restart());
            this.completionRestartButton.addEventListener('click', () => this.restart());

            // 初期表示
            this.showStartScreen();
        });

        // 方向ごとの重力の設定
        this.gravity = 0.5;

        // クリックポイントの情報を保持
        this.clickPoints = [];

        // 最新のクリックポイント情報を保持
        this.currentClickPoint = null;

        // レベルアップ通知の要素を作成
        this.levelUpNotification = document.createElement('div');
        this.levelUpNotification.className = 'level-up-notification';
        document.querySelector('.game-container').appendChild(this.levelUpNotification);
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        
        // コンテナの幅に合わせてキャンバスサイズを設定
        const newScale = Math.min(1, containerWidth / this.baseWidth);
        this.canvas.width = this.baseWidth * newScale;
        this.canvas.height = this.baseHeight * newScale;
        
        // スケール値を保存
        this.currentScale = newScale;
        
        // コンテキストの設定をリセット
        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(newScale, newScale);
    }

    adjustObjectsPosition() {
        // 既存のオブジェクトの位置を新しいスケールに合わせて調整
        this.objects.forEach(obj => {
            // オブジェクトの出現位置を基準に調整
            switch(obj.side) {
                case 0: // 上から
                    if (obj.y < 0) {
                        obj.y = -obj.size;
                    }
                    break;
                case 1: // 右から
                    if (obj.x > this.baseWidth) {
                        obj.x = this.baseWidth + obj.size;
                    }
                    break;
                case 2: // 下から
                    if (obj.y > this.baseHeight) {
                        obj.y = this.baseHeight + obj.size;
                    }
                    break;
                case 3: // 左から
                    if (obj.x < 0) {
                        obj.x = -obj.size;
                    }
                    break;
            }
        });
    }

    showStartScreen() {
        this.startScreen.style.display = 'flex';
        this.countdownElement.style.display = 'none';
        this.gameOverModal.style.display = 'none';
        this.completionModal.style.display = 'none';
        this.quitButton.style.display = 'none';
    }

    async startCountdown() {
        this.startScreen.style.display = 'none';
        this.countdownElement.style.display = 'flex';
        
        // カウントダウン
        for (let i = 3; i > 0; i--) {
            this.countdownNumber.textContent = i;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        this.countdownElement.style.display = 'none';
        this.startGame();
    }

    startGame() {
        this.score = 0;
        this.hp = 3;
        this.level = 1;
        this.lastLevelScore = 0;
        this.objects = [];
        this.isGameRunning = true;
        this.quitButton.style.display = 'block';
        this.updateStats();
        this.gameLoop();
    }

    showGameOver() {
        this.isGameRunning = false;
        this.finalScoreElement.textContent = this.score;
        this.finalLevelElement.textContent = this.level;
        this.gameOverModal.style.display = 'flex';
        this.quitButton.style.display = 'none';
    }

    restart() {
        this.gameOverModal.style.display = 'none';
        this.completionModal.style.display = 'none';
        this.quitButton.style.display = 'block';
        this.startCountdown();
    }

    createObject() {
        const types = ['shrimp', 'bomb', 'goldenShrimp', 'octopus'];
        const weights = [60, 15, 5, 20];
        
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        let typeIndex = 0;
        
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                typeIndex = i;
                break;
            }
        }

        const type = types[typeIndex];
        const size = type === 'goldenShrimp' ? 50 : 40;
        
        let x, y, dx, dy, originX, originY;
        const side = Math.floor(Math.random() * 4);

        // 速度の計算（画面サイズに応じて調整）
        // 小さい画面では速く、大きい画面では遅く
        const speedMultiplier = this.currentScale <= 0.7 
            ? 1 + (1 - this.currentScale) * 0.5  // 小さい画面用の計算
            : 1 - (this.currentScale - 0.7) * 0.3; // 大きい画面用の計算

        const baseSpeed = (this.baseSpeed.min + Math.random() * (this.baseSpeed.max - this.baseSpeed.min)) 
            * this.currentScale 
            * speedMultiplier;

        // 画面外からの出現位置を設定
        const margin = size;
        switch(side) {
            case 0: // 上から
                x = Math.random() * (this.baseWidth - margin * 2) + margin;
                y = -size;
                originY = y;
                dx = (Math.random() - 0.5) * 4 * this.currentScale * speedMultiplier; // 横方向の速度を調整（6→4）
                dy = baseSpeed;
                break;
            case 1: // 右から
                x = this.baseWidth + size;
                y = Math.random() * (this.baseHeight - margin * 2) + margin;
                originX = x;
                dx = -baseSpeed;
                dy = (Math.random() - 0.5) * 4 * this.currentScale * speedMultiplier;
                break;
            case 2: // 下から
                x = Math.random() * (this.baseWidth - margin * 2) + margin;
                y = this.baseHeight + size;
                originY = y;
                dx = (Math.random() - 0.5) * 4 * this.currentScale * speedMultiplier;
                dy = -baseSpeed;
                break;
            case 3: // 左から
                x = -size;
                y = Math.random() * (this.baseHeight - margin * 2) + margin;
                originX = x;
                dx = baseSpeed;
                dy = (Math.random() - 0.5) * 4 * this.currentScale * speedMultiplier;
                break;
        }

        // レベルに応じた速度の追加調整（調整値を小さく）
        const levelSpeedMultiplier = 1 + (this.level - 1) * 0.08; // 0.1→0.08に減少
        dx *= levelSpeedMultiplier;
        dy *= levelSpeedMultiplier;

        // ランダムな移動距離を計算
        const distanceRange = this.currentScale <= 0.7 ? this.moveDistance.small : this.moveDistance.large;
        const randomDistance = distanceRange.min + Math.random() * (distanceRange.max - distanceRange.min);
        
        return {
            x,
            y,
            dx,
            dy,
            size,
            type,
            active: true,
            side,
            originX,
            originY,
            maxDistance: Math.max(this.baseWidth, this.baseHeight) * randomDistance,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.15 * this.currentScale * speedMultiplier
        };
    }

    handleClick(event) {
        if (!this.isGameRunning) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const scale = this.baseWidth / rect.width;
        
        const x = (event.clientX - rect.left) * scale;
        const y = (event.clientY - rect.top) * scale;
        
        this.checkCollisionImproved(x, y);
    }

    handleTouch(event) {
        if (!this.isGameRunning) return;
        
        event.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const scale = this.baseWidth / rect.width;
        
        const x = (event.touches[0].clientX - rect.left) * scale;
        const y = (event.touches[0].clientY - rect.top) * scale;
        
        this.checkCollisionImproved(x, y);
    }

    checkCollisionImproved(x, y) {
        // クリック可能なオブジェクトのみをフィルタリング
        const clickableObjects = this.objects.filter(obj => obj.active);
        
        if (clickableObjects.length === 0) return;

        // 最後に描画された（画面上で最前面の）オブジェクトから判定
        for (let i = clickableObjects.length - 1; i >= 0; i--) {
            const obj = clickableObjects[i];
            const distance = Math.sqrt(
                Math.pow(x - obj.x, 2) + Math.pow(y - obj.y, 2)
            );

            // オブジェクトの種類に応じて判定範囲を調整
            let hitboxSize;
            switch(obj.type) {
                case 'shrimp':
                    hitboxSize = obj.size * 1.3;
                    break;
                case 'goldenShrimp':
                    hitboxSize = obj.size * 1.4;
                    break;
                case 'bomb':
                    hitboxSize = obj.size * 1.2;
                    break;
                case 'octopus':
                    hitboxSize = obj.size * 1.2;
                    break;
                default:
                    hitboxSize = obj.size;
            }

            // 最初にヒットしたオブジェクトのみを処理
            if (distance < hitboxSize) {
                this.handleObjectClick(obj);
                this.drawClickPoint(x, y, true);
                return; // 最初のヒットで処理を終了
            }
        }

        // ヒットしなかった場合
        this.drawClickPoint(x, y, false);
    }

    handleObjectClick(obj) {
        switch(obj.type) {
            case 'shrimp':
                this.score += 100;
                this.playClickEffect(obj, '#FF6B6B');
                break;
            case 'goldenShrimp':
                this.score += 500;
                if (this.hp < 3) this.hp++;
                this.playClickEffect(obj, '#FFD700');
                break;
            case 'bomb':
                this.hp--;
                this.playClickEffect(obj, '#FF0000');
                break;
            case 'octopus':
                this.score = Math.max(0, this.score - 200); // スコアを200減らす（最小0）
                this.playClickEffect(obj, '#800080'); // 紫色のエフェクト
                break;
        }
        obj.active = false;
        this.updateStats();
        this.checkLevelUp();
    }

    playClickEffect(obj, color) {
        // クリック時のエフェクトを描画
        this.ctx.beginPath();
        this.ctx.arc(obj.x, obj.y, obj.size * 1.5, 0, Math.PI * 2);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        this.ctx.closePath();

        // エフェクトを徐々に消す
        let alpha = 1.0;
        const fadeEffect = setInterval(() => {
            alpha -= 0.1;
            if (alpha <= 0) {
                clearInterval(fadeEffect);
                this.draw(); // 通常の描画に戻る
            } else {
                this.ctx.beginPath();
                this.ctx.arc(obj.x, obj.y, obj.size * 1.5, 0, Math.PI * 2);
                this.ctx.strokeStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
                this.ctx.closePath();
            }
        }, 50);
    }

    drawClickPoint(x, y, hit) {
        // 新しいクリックポイントを設定
        this.currentClickPoint = {
            x,
            y,
            hit
        };
    }

    updateStats() {
        this.scoreElement.textContent = this.score;
        this.hpElement.textContent = this.hp;
        this.levelElement.textContent = this.level;
    }

    drawObject(obj) {
        this.ctx.save();
        this.ctx.translate(obj.x, obj.y);
        this.ctx.rotate(obj.rotation);

        let image;
        let drawSize = obj.size * 2;

        switch(obj.type) {
            case 'shrimp':
                image = this.images.shrimp;
                break;
            case 'goldenShrimp':
                image = this.images.goldenShrimp;
                break;
            case 'bomb':
                image = this.images.bomb;
                break;
            case 'octopus':
                image = this.images.octopus;
                drawSize = obj.size * 2.5; // タコは少し大きめに表示
                break;
        }

        if (image) {
            this.ctx.drawImage(
                image,
                -drawSize/2,
                -drawSize/2,
                drawSize,
                drawSize
            );
        }

        this.ctx.restore();
    }

    update() {
        if (!this.isGameRunning) return;

        // オブジェクトの生成頻度を画面サイズに応じて調整
        const spawnChance = 0.02 * this.level * 
            (this.currentScale <= 0.7 
                ? (1 + (1 - this.currentScale) * 0.3)  // 小さい画面用
                : (1 - (this.currentScale - 0.7) * 0.2)); // 大きい画面用
        
        if (Math.random() < spawnChance) {
            this.objects.push(this.createObject());
        }

        // オブジェクトの更新
        this.objects = this.objects.filter(obj => {
            if (!obj.active) return false;

            // 位置の更新
            obj.x += obj.dx;
            obj.y += obj.dy;

            // 方向に応じた重力の適用（画面サイズに応じて調整）
            const gravityMultiplier = this.currentScale <= 0.7
                ? 1 + (1 - this.currentScale) * 0.5  // 小さい画面用
                : 1 - (this.currentScale - 0.7) * 0.3; // 大きい画面用
            
            const gravity = this.gravity * this.currentScale * gravityMultiplier * 0.8; // 重力も20%減少
            
            switch(obj.side) {
                case 0: // 上から出現
                    if (obj.y > obj.maxDistance) {
                        obj.dy -= gravity;
                    }
                    break;
                case 1: // 右から出現
                    if (obj.x < obj.originX - obj.maxDistance) {
                        obj.dx += gravity;
                    }
                    break;
                case 2: // 下から出現
                    if (obj.y < obj.originY - obj.maxDistance) {
                        obj.dy += gravity;
                    }
                    break;
                case 3: // 左から出現
                    if (obj.x > obj.maxDistance) {
                        obj.dx -= gravity;
                    }
                    break;
            }

            // 回転の更新
            obj.rotation += obj.rotationSpeed;

            // 画面外判定（マージンを追加）
            const margin = obj.size * 2;
            return !(
                (obj.side === 0 && obj.y < -margin) || // 上に消える
                (obj.side === 1 && obj.x > this.baseWidth + margin) || // 右に消える
                (obj.side === 2 && obj.y > this.baseHeight + margin) || // 下に消える
                (obj.side === 3 && obj.x < -margin) // 左に消える
            );
        });
    }

    draw() {
        this.ctx.save();
        this.ctx.clearRect(0, 0, this.baseWidth, this.baseHeight);

        // オブジェクトの描画
        this.objects.forEach(obj => {
            if (obj.active) {
                this.drawObject(obj);
            }
        });

        // クリックポイントの描画
        if (this.currentClickPoint) {
            // 外側の円
            this.ctx.beginPath();
            this.ctx.arc(this.currentClickPoint.x, this.currentClickPoint.y, 10, 0, Math.PI * 2);
            this.ctx.strokeStyle = this.currentClickPoint.hit ? '#00FF00' : '#FF0000';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            
            // 内側の円
            this.ctx.beginPath();
            this.ctx.arc(this.currentClickPoint.x, this.currentClickPoint.y, 3, 0, Math.PI * 2);
            this.ctx.fillStyle = this.currentClickPoint.hit ? '#00FF00' : '#FF0000';
            this.ctx.fill();
            this.ctx.closePath();
        }
        this.ctx.restore();
    }

    gameLoop() {
        if (this.hp <= 0) {
            this.showGameOver();
            return;
        }

        if (!this.isGameRunning) return;

        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    checkLevelUp() {
        // 現在のスコアが次のレベルに必要なスコアを超えているかチェック
        const nextLevelScore = this.lastLevelScore + (this.baseScoreForLevel * this.level);
        if (this.score >= nextLevelScore) {
            this.level++;
            this.lastLevelScore = nextLevelScore;
            this.updateStats();
            
            // レベルアップ表示
            this.showLevelUpEffect();
        }
    }

    showLevelUpEffect() {
        // レベルアップ時の視覚効果
        this.levelUpNotification.innerHTML = `
            <div class="level-up-content">
                <div class="level-up-title">LEVEL UP!</div>
                <div class="level-up-number">${this.level}</div>
            </div>
        `;
        this.levelUpNotification.style.display = 'flex';

        // 画面を一時的に明るくする
        const flash = document.createElement('div');
        flash.className = 'screen-flash';
        document.querySelector('.game-container').appendChild(flash);

        // フラッシュ効果を削除
        setTimeout(() => {
            flash.remove();
        }, 500);

        // レベルアップ通知を消す
        setTimeout(() => {
            this.levelUpNotification.style.display = 'none';
        }, 2000);

        // レベルアップ音を再生
        this.playLevelUpSound();
    }

    playLevelUpSound() {
        const audio = new Audio();
        audio.src = 'data:audio/mpeg;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAKAAAIkAAkJCQkJCQkJEhISEhISEhIbGxsbGxsbGyPj4+Pj4+Pj7e3t7e3t7e32NjY2NjY2Nj//////////////////////wAAADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMP/7kMQAAAAAAJAAAAAAAAAASIAAAAExhdGUAAAAPAAAACgAABJAAJCQkSEhIbGxsj4+Pt7e32Nj//////zAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQxOYAE4ANAAAAAAAA0AAAAACYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhY';
        audio.play().catch(() => {}); // エラーを無視（ブラウザによってはユーザーインタラクション必要）
    }

    quitGame() {
        if (this.isGameRunning) {
            this.isGameRunning = false;
            this.showCompletionModal();
        }
    }

    showCompletionModal() {
        this.completionScoreElement.textContent = this.score;
        this.completionLevelElement.textContent = this.level;
        this.completionModal.style.display = 'flex';
        this.quitButton.style.display = 'none';
    }
}

// ゲームの開始
window.onload = () => {
    new Game();
}; 