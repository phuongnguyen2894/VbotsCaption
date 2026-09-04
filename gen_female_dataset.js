// Generate 500 Vietnamese caption training examples (internet/social tone)
// Themes: beauty, figure, professionalism, acting — praising women
// Output format matches the deployed app prompt (with Vietnamese-forcing line).
const fs = require('fs');

const RULES = (topic) =>
`Generate 1 X (Twitter) post caption about: "${topic}"
Tone: Admiring

Rules:
- Caption must be strictly under 500 characters
- NEVER include hashtags (words starting with #) anywhere in the caption
- Do NOT include keywords from the list in the caption text
- Make it punchy, engaging, and share-worthy
- Return ONLY the raw caption text — no quotes, no explanation, no JSON

QUAN TRỌNG: Chủ đề bằng tiếng Việt, nên BẮT BUỘC viết caption hoàn toàn bằng tiếng Việt tự nhiên. Tuyệt đối không dùng tiếng Anh.`;

const themes = {
  beauty: {
    topics: [
      "Vẻ đẹp rạng rỡ của nữ chính", "Nhan sắc cực phẩm của cô ấy",
      "Visual đỉnh cao của nữ diễn viên", "Gương mặt xinh đẹp của nàng",
      "Đôi mắt biết nói của cô ấy", "Nụ cười toả nắng của nữ chính",
      "Thần thái ngôi sao của cô ấy", "Làn da đẹp không tì vết",
      "Vẻ đẹp không góc chết", "Khí chất sang chảnh của nàng",
      "Vẻ đẹp ngọt ngào của nữ diễn viên", "Nhan sắc lên hương từng ngày",
      "Vẻ đẹp cuốn hút khó cưỡng", "Góc nghiêng thần thánh của cô ấy",
      "Vẻ đẹp tự nhiên không son phấn", "Nhan sắc gây thương nhớ",
    ],
    openers: ["", "", "", "", "", "Trời ơi, ", "U là trời, ", "Xỉu ngang, ", "Hết nước chấm, ", "Mèn ơi, ", "Chu choa, ", "Ơ kìa, "],
    emojis: ["", "", "", "", " 😍", " 🥹", " ✨", " 🔥", " 😭", " 💖", " 🤩"],
    bases: [
      "Nhan sắc đỉnh nóc kịch trần, nhìn một cái là yêu không kịp vuốt.",
      "Visual cực phẩm đúng nghĩa, soi cỡ nào cũng không ra nổi một góc xấu.",
      "Trời sinh ra để được lên hình, camera nào cũng phải nể vài phần.",
      "Đẹp kiểu chẳng cần cố gắng, tự nhiên thôi mà vẫn cuốn không rời mắt nổi.",
      "Gương mặt xinh từ trong trứng, ngắm hoài mà tim cứ loạn nhịp.",
      "Mỗi lần lộ diện là một lần dân tình xỉu ngang vì xinh quá đáng.",
      "Đôi mắt biết nói, liếc nhẹ thôi mà người ta rớt tim cái độp.",
      "Nụ cười toả nắng làm sáng bừng cả khung hình, ngắm mãi không chán.",
      "Da đẹp dáng xinh, nhìn phát là muốn lưu liền về làm hình nền.",
      "Thần thái này không phải dạng vừa, bước ra là cân trọn cả ê-kíp.",
      "Xinh đến mức quên cả thở, đúng kiểu nhan sắc gây thương nhớ.",
      "Mặt mộc mà còn xinh ngất ngây thì makeup vào chắc đổ cả con phố.",
      "Góc nghiêng thần thánh, góc thẳng cũng đỉnh, đúng là không có góc chết.",
      "Lên hình là auto sáng, đứng giữa đám đông vẫn nổi bần bật.",
      "Visual lên hương từng ngày, càng nhìn càng thấy mê mẩn không lối thoát.",
      "Nhan sắc đỉnh cao kiểu này thì ai mà chịu nổi, xỉu lên xỉu xuống.",
      "Cười cái là cả thế giới dịu lại, đẹp dịu dàng mà vẫn cực kỳ cuốn hút.",
      "Đẹp lạ đẹp sang, nhìn qua một lần là nhớ mãi không quên được.",
      "Visual này mà không gọi là cực phẩm thì còn từ nào xứng nữa trời.",
      "Ánh nhìn sắc lẹm mà vẫn ngọt ngào, đúng chuẩn vừa yêu vừa nể.",
      "Đẹp tới nỗi để mặt không cũng đủ cân cả tấm poster phim.",
      "Mỗi tấm hình là một lần muốn zoom vào ngắm cho thật kỹ.",
      "Nhìn thôi đã thấy mát cả mắt, nhan sắc này đúng là quà của vũ trụ.",
      "Xinh có gu, đẹp có chất, nhìn một lần là chốt đơn theo dõi liền.",
      "Khí chất sang chảnh toát ra từ ánh mắt, sang mà không hề xa cách.",
      "Càng lớn càng mặn mà, nhan sắc cứ thế mà thăng hạng vù vù.",
      "Lông mày sống mũi bờ môi, chỗ nào cũng được tạo hoá ưu ái hết mức.",
      "Đẹp tự nhiên không cần app, lên hình cận cảnh vẫn mịn màng láng o.",
      "Một cái nhìn thôi cũng đủ làm tan chảy cả ngàn người, lợi hại thật.",
      "Nhan sắc này chắc kiếp trước cứu cả thế giới mới có được đó.",
      "Đẹp đến mức nhìn xong chỉ biết câm nín rồi lặng lẽ bấm theo dõi.",
      "Visual gánh cả khung hình, đứng đâu là ánh sáng dồn về đó.",
      "Vừa xinh vừa có thần, đúng kiểu nhan sắc khiến người ta nhớ lâu.",
      "Mặt xinh dáng chuẩn thần thái ngút ngàn, combo này ai mà cự lại.",
      "Đôi mắt long lanh như có cả bầu trời sao trong đó, nhìn là lịm.",
      "Lên đồ giản dị thôi mà vẫn đẹp xỉu, nhan sắc cân hết mọi phong cách.",
      "Nhìn nàng cười là tự nhiên thấy ngày dài cũng nhẹ nhõm hẳn ra.",
      "Đẹp kiểu điện ảnh, từng khung hình cứ như poster treo rạp.",
      "Visual này là loại đẹp khiến người ta tua đi tua lại chỉ để ngắm.",
      "Nhan sắc rạng rỡ, đứng giữa rừng người vẫn là tâm điểm sáng nhất.",
      "Da căng bóng mắt long lanh, đúng chuẩn nhan sắc đỉnh của chóp.",
      "Xinh thế này thì lướt tới đâu cũng phải dừng lại ngắm một hồi.",
      "Vẻ đẹp vừa hiện đại vừa có nét riêng, không lẫn vào đâu được.",
      "Đẹp mà còn có khí chất, đúng kiểu nhìn là biết ngôi sao thực thụ.",
      "Mỗi lần xuất hiện là một lần làm dân mạng quay xe yêu liền tại chỗ.",
      "Nhan sắc này lên camera thường còn đỉnh, nói gì máy xịn nữa trời.",
      "Cười tươi một cái là bao nhiêu mệt mỏi của người xem bay sạch.",
      "Đẹp dịu mà sắc, nhìn lâu một chút là tự dưng thấy mê hồi nào không hay.",
      "Visual chuẩn nữ thần, mỗi cái chớp mắt cũng thành khoảnh khắc đáng lưu.",
      "Nhan sắc đỉnh đến mức chẳng cần caption, để hình nói hết là đủ rồi.",
      "Đẹp một cách rất riêng, vừa nhìn đã biết là không đụng hàng ai.",
      "Thần thái ngời ngời, đứng yên thôi cũng đủ thành một bức tranh.",
      "Nhìn cái mặt này buổi sáng là auto có động lực cày hết cả ngày.",
      "Xinh xuất sắc, đúng kiểu nhan sắc làm người ta tin vào tạo hoá.",
      "Vẻ đẹp cuốn từ ánh mắt tới khoé cười, mê từ giây đầu tiên luôn.",
    ],
  },
  figure: {
    topics: [
      "Vóc dáng chuẩn của nữ diễn viên", "Body nóng bỏng của cô ấy",
      "Dáng người thanh thoát của nàng", "Đôi chân dài miên man",
      "Vóc dáng săn chắc gợi cảm", "Thần thái khi diện đầm dạ hội",
      "Vóc dáng cân mọi outfit", "Eo thon dáng chuẩn",
      "Sự gợi cảm tinh tế của cô ấy", "Vóc dáng giữ gìn hoàn hảo",
      "Khí chất khi sải bước thảm đỏ", "Dáng chuẩn người mẫu",
      "Vóc dáng khoẻ đẹp đầy sức sống", "Đường cong quyến rũ của nàng",
      "Vóc dáng thành quả của kỷ luật", "Thần thái khi lên đồ quyền lực",
    ],
    openers: ["", "", "", "", "", "Trời đất ơi, ", "U là trời, ", "Xỉu, ", "Bốc cháy luôn, ", "Mèn ơi, ", "Nóng quá đi, ", "Ố ồ, "],
    emojis: ["", "", "", "", " 🔥", " 😍", " ✨", " 💃", " 🤩", " 👏"],
    bases: [
      "Dáng này là chuẩn người mẫu chứ đùa, mặc gì lên cũng thành ảnh tạp chí.",
      "Body săn chắc mà vẫn mềm mại, đúng kiểu vừa khoẻ khoắn vừa quyến rũ.",
      "Đôi chân dài miên man, bước đi thôi mà như đang catwalk giữa đời thực.",
      "Eo thon dáng chuẩn, diện đầm ôm là cả khung hình bốc cháy luôn á.",
      "Vóc dáng cân mọi kiểu đồ, từ đồ kín tới đồ gợi cảm đều xử đẹp hết.",
      "Dáng đẹp tới mức mặc đồ bao bố chắc cũng thành xu hướng mất thôi.",
      "Thân hình này là thành quả của kỷ luật, nhìn là biết chăm chỉ cỡ nào.",
      "Diện váy dạ hội lên là sang chảnh ngút ngàn, đúng chuẩn nữ hoàng thảm đỏ.",
      "Vai thon eo nhỏ chân dài, combo vóc dáng trong mơ của bao người.",
      "Dáng chuẩn thần thái đỉnh, đứng giữa dàn sao vẫn nổi nhất khung.",
      "Body gọn gàng săn chắc, nhìn khoẻ khoắn mà vẫn cực kỳ cuốn hút.",
      "Mặc đồ thể thao thôi mà cũng toát ra sự gợi cảm rất tinh tế.",
      "Vóc dáng giữ gìn quá khéo, năm tháng chẳng làm khó được nàng.",
      "Đường cong chuẩn chỉnh, vừa quyến rũ vừa thanh lịch, đỉnh thật sự.",
      "Dáng này lên đồ công sở là sang, lên đồ dạ tiệc là lộng lẫy luôn.",
      "Lưng thẳng vai mở, thần thái khi sải bước cứ gọi là cuốn không rời mắt.",
      "Vóc dáng đẹp tự nhiên, không cần khoe vẫn thấy rõ sự chăm chút.",
      "Diện áo khoe eo con kiến, fan chỉ biết xỉu ngang xỉu dọc thôi.",
      "Thân hình cân đối từng centimet, đúng chuẩn nhìn là muốn đi tập liền.",
      "Dáng cao ráo thanh thoát, khoác lên người gì cũng thành thời trang.",
      "Body này là cả một quá trình, nhìn là nể cái sự nghiêm túc với bản thân.",
      "Mặc đầm đuôi cá lên là đúng chuẩn tiểu thư bước ra từ phim cổ tích.",
      "Đôi chân thẳng tắp dài miên man, đứng đâu cũng thành tâm điểm.",
      "Vóc dáng săn gọn mà vẫn nữ tính, đúng kiểu khoẻ đẹp đáng ngưỡng mộ.",
      "Tự tin khoe dáng trên thảm đỏ, vừa gợi cảm vừa toát lên thần thái.",
      "Dáng đẹp tới nỗi đứng yên chụp thôi cũng ra cả bộ ảnh thần thái.",
      "Eo thon chân dài lưng ong, vóc dáng này đúng là quà của sự chăm chỉ.",
      "Lên đồ tối giản mà vẫn sang, vóc dáng tự nó đã là phụ kiện đắt nhất.",
      "Thân hình gợi cảm có chừng mực, đẹp mà vẫn sang chứ không hề phô.",
      "Dáng chuẩn không cần chỉnh app, lên hình full body vẫn đỉnh từng khung.",
      "Diện suit lên là quyền lực ngút trời, vừa ngầu vừa cuốn không tả nổi.",
      "Vóc dáng cứ gọi là nuột nà, ngắm cái là muốn lập tức đăng ký phòng gym.",
      "Sải bước trên thảm đỏ mà như đang trình diễn, thần thái không ai cản nổi.",
      "Body khoẻ khoắn năng động, nhìn tràn đầy sức sống mà vẫn quyến rũ.",
      "Dáng người mảnh mai mà vẫn có đường cong, đúng kiểu vừa mắt vô cùng.",
      "Mặc gì cũng đẹp vì vóc dáng đã làm hết việc rồi, outfit chỉ là phụ.",
      "Vòng eo nhỏ xíu cùng đôi chân thẳng, combo này là mơ ước của hội chị em.",
      "Thân hình giữ dáng cực khéo, lên hình cận hay xa đều chuẩn không cần chỉnh.",
      "Diện váy ngắn khoe chân là cả cõi mạng dậy sóng vì quá xuất sắc.",
      "Vóc dáng vừa thể thao vừa nữ tính, đẹp kiểu rất khoẻ và rất đời.",
      "Dáng này là chuẩn mực luôn rồi, nhìn xong chỉ muốn nghiêm túc tập tành.",
      "Khoác blazer lên vai là khí chất quyền lực toát ra ngùn ngụt.",
      "Đường cong mềm mại uyển chuyển, mỗi dáng đứng đều như có tính toán.",
      "Body chuẩn từng góc, lên đồ dạ hội là đúng nghĩa nữ thần thảm đỏ.",
      "Vóc dáng săn chắc khoẻ đẹp, đúng kiểu truyền cảm hứng sống lành mạnh.",
      "Dáng thon eo nhỏ, diện đồ gì cũng tôn lên trọn vẹn từng đường nét.",
      "Thần thái khi mặc đầm dài cứ gọi là sang chảnh hết phần thiên hạ.",
      "Body đẹp là có thật, nhìn là biết đổ bao mồ hôi trong phòng tập.",
      "Vóc dáng chuẩn chỉnh tới mức đứng cạnh ai cũng tự động nổi bật hơn.",
      "Mặc đồ đơn giản mà vẫn cuốn, vì khí chất với dáng đã quá đỉnh rồi.",
    ],
  },
  professional: {
    topics: [
      "Sự chuyên nghiệp trên phim trường", "Thái độ làm việc của nữ diễn viên",
      "Tinh thần nghiêm túc với nghề", "Cô ấy luôn đúng giờ và tận tâm",
      "Sự tận tụy với từng vai diễn", "Cách cô ấy đối xử với đồng nghiệp",
      "Tinh thần cầu tiến của nàng", "Sự chỉn chu trong công việc",
      "Nỗ lực thầm lặng sau ánh hào quang", "Đạo đức nghề nghiệp đáng nể",
      "Sự kỷ luật với bản thân", "Tinh thần làm nghề tử tế",
      "Cô ấy đi lên bằng thực lực", "Sự khiêm tốn dù đã nổi tiếng",
      "Tâm huyết với từng dự án", "Phong độ ổn định qua các vai",
    ],
    openers: ["", "", "", "", "", "Thật sự nể, ", "Phải công nhận, ", "Nói thật nhé, ", "Càng biết càng nể, ", "Đáng nể ghê, ", "Công nhận luôn, "],
    emojis: ["", "", "", "", " 👏", " ✨", " 🤩", " 💪", " 🙌"],
    bases: [
      "Đi làm đúng giờ, thuộc thoại từng chữ, đúng chuẩn người làm nghề tử tế.",
      "Trên phim trường lúc nào cũng nghiêm túc hết mình, nể cái thái độ này ghê.",
      "Chuyên nghiệp từ cách chuẩn bị vai tới cách đối xử với cả ê-kíp.",
      "Cảnh khó tới mấy cũng tự làm, không ngại cực, đúng là tận tâm với nghề.",
      "Thái độ làm việc đỉnh cao, nhìn là biết yêu nghề tới mức nào.",
      "Khiêm tốn chịu khó lắng nghe đạo diễn, mẫu người ai làm chung cũng quý.",
      "Hết mình với từng phân cảnh, không bao giờ làm cho có, phục thật sự.",
      "Chuẩn bị kỹ tới từng chi tiết nhỏ, đúng kiểu nghiêm túc với từng vai.",
      "Đối xử với đồng nghiệp hoà nhã, từ bảo vệ tới diễn viên chính đều thân thiện.",
      "Càng nổi càng khiêm tốn, thái độ này mới giữ được đường dài trong nghề.",
      "Cày vai cật lực, học thoại tới khuya, thành công không phải tự nhiên mà có.",
      "Trên trường quay luôn đúng giờ chỉn chu, không để ai phải chờ bao giờ.",
      "Nghiêm túc với nghề tới mức cảnh nào cũng đầu tư hết một trăm phần trăm.",
      "Tinh thần cầu tiến cao, vai sau luôn tốt hơn vai trước, nể sự nỗ lực này.",
      "Làm việc có tâm có tầm, đúng kiểu nghệ sĩ vừa tài năng vừa chuyên nghiệp.",
      "Không ồn ào thị phi, chỉ có sản phẩm tốt, đường dài đi bằng thực lực.",
      "Chăm chỉ tới mức nghỉ giải lao cũng ngồi ôn thoại, ai mà không nể.",
      "Thái độ cầu thị, sai là sửa, học là tới nơi, đúng người làm nghề nghiêm túc.",
      "Mỗi dự án là một lần lột xác, vì đầu tư cho vai diễn không hề tiếc sức.",
      "Chuyên nghiệp tới mức đạo diễn nào hợp tác xong cũng muốn mời lại liền.",
      "Giữ hình ảnh sạch, làm việc kỷ luật, đúng chuẩn nghệ sĩ đáng để học hỏi.",
      "Tới sớm về trễ, làm hết mình rồi mới nghỉ, tinh thần này hiếm có lắm.",
      "Vào vai là quên hết mệt, cháy hết mình tới khi đạo diễn hô cắt mới thôi.",
      "Tự tập luyện kỹ năng cho vai, không ngại khó, phục cái sự nghiêm túc này.",
      "Đối đãi với fan và ê-kíp đều chân thành, đẹp người mà còn đẹp cả nết.",
      "Đằng sau ánh hào quang là cả tấn nỗ lực thầm lặng, càng biết càng nể.",
      "Luôn giữ tinh thần học hỏi, không tự mãn dù đã có chỗ đứng vững vàng.",
      "Làm nghề bằng cái tâm, chăm chút từng vai như chăm con, đáng quý vô cùng.",
      "Chuyên nghiệp từ buổi casting tới ngày đóng máy, không một lần làm khó ai.",
      "Càng làm việc chung càng được khen, đó mới là thước đo thật của sự tử tế.",
      "Nhập vai tới nơi tới chốn, nghiên cứu nhân vật kỹ như làm luận văn vậy.",
      "Đúng giờ đúng cam kết giữ chữ tín, mẫu nghệ sĩ mà ai cũng muốn hợp tác.",
      "Khó khăn cỡ nào cũng giữ thái độ tích cực, truyền năng lượng cho cả đoàn.",
      "Không ngại vai gai góc, không ngại hình tượng xấu, miễn vai hay là nhận.",
      "Tận tuỵ với nghề từ những ngày chưa ai biết tới, nền tảng vững là vì vậy.",
      "Lắng nghe góp ý, sửa từng chút một, thái độ cầu tiến này đáng tuyên dương.",
      "Phía sau mỗi vai diễn đỉnh là hàng tháng trời chuẩn bị, nỗ lực thầm lặng.",
      "Giữ phong độ ổn định qua từng dự án, chứng tỏ thực lực chứ không phải may.",
      "Làm việc nghiêm túc nhưng vẫn vui vẻ hoà đồng, đúng kiểu được lòng cả đoàn.",
      "Chuyên nghiệp là khi mệt vẫn cười, đau vẫn diễn trọn, nể tinh thần thép này.",
      "Đầu tư cho nghề không tiếc, từ học thoại tới rèn thể lực đều làm tới cùng.",
      "Tự tin mà không kiêu, giỏi mà vẫn ham học, mẫu nghệ sĩ hiếm có khó tìm.",
      "Cẩn thận tỉ mỉ từng cảnh nhỏ, vì biết khán giả luôn để ý từng chi tiết.",
      "Đi lên bằng thực lực và sự chăm chỉ, thành quả hôm nay hoàn toàn xứng đáng.",
      "Trên trường quay là một người, ngoài đời vẫn khiêm nhường, đáng nể thật sự.",
      "Vai chính hay vai phụ đều làm hết sức, vì với cô ấy vai nào cũng quan trọng.",
      "Giữ kỷ luật bản thân cực tốt, nhìn cách làm việc là biết sẽ còn tiến xa.",
      "Không ngừng làm mới mình qua từng vai, tinh thần cầu tiến đáng học hỏi.",
      "Chuyên nghiệp tới mức biến cảnh khó thành cảnh đáng nhớ, quá đỉnh luôn.",
      "Làm nghề tử tế sống tử tế, đẹp từ năng lực tới nhân cách, ngưỡng mộ ghê.",
    ],
  },
  acting: {
    topics: [
      "Diễn xuất nhập tâm của nữ chính", "Khả năng diễn cảnh khóc",
      "Diễn xuất chạm đến cảm xúc", "Cô ấy cân mọi dạng vai",
      "Lối diễn tự nhiên chân thật", "Diễn xuất bùng nổ trong cảnh cao trào",
      "Ánh mắt biết diễn của nữ diễn viên", "Khả năng hoá thân vào nhân vật",
      "Diễn nội tâm bằng ánh mắt", "Sự biến hoá qua từng vai diễn",
      "Diễn xuất có chiều sâu", "Khả năng tiết chế cảm xúc",
      "Diễn cảnh tâm lý nặng", "Đài từ và biểu cảm đỉnh cao",
      "Diễn xuất ngày càng chín", "Khả năng dẫn dắt cảm xúc khán giả",
    ],
    openers: ["", "", "", "", "", "Trời ơi, ", "Khóc luôn rồi, ", "Nổi da gà, ", "Đỉnh thật sự, ", "Phục sát đất, ", "Quá đã, "],
    emojis: ["", "", "", "", " 👏", " 😭", " 🔥", " ✨", " 🤩", " 🥹"],
    bases: [
      "Diễn như không diễn, nhập vai tới mức quên luôn đây là phim, đỉnh thật sự.",
      "Cảnh khóc mà người xem khóc theo, đúng kiểu diễn xuất chạm tới tận tim.",
      "Ánh mắt biết diễn, chưa cần thoại đã thấy cả bầu trời tâm trạng trong đó.",
      "Cân được hết từ vai ngọt ngào tới vai gai góc, biến hoá khôn lường luôn.",
      "Mỗi biểu cảm là một nhát dao vào tim người xem, diễn mà thật tới đáng sợ.",
      "Vào vai phản diện mà vừa ghét nhân vật vừa nể diễn viên, đẳng cấp là đây.",
      "Lối diễn tự nhiên như hơi thở, không gồng không giả, xem mà cuốn không rời.",
      "Cảnh cao trào bùng nổ cảm xúc, diễn tới nơi tới chốn làm cả màn hình rung.",
      "Khóc một cái là kéo theo cả rạp khóc, đúng chuẩn diễn xuất có sức nặng.",
      "Hoá thân trọn vẹn, buồn vui giận hờn gì cũng làm người xem tin sái cổ.",
      "Diễn nội tâm bằng ánh mắt thôi mà đủ kể cả một câu chuyện dài, quá giỏi.",
      "Tiết chế đúng lúc, bùng nổ đúng chỗ, đúng kiểu diễn viên biết mình làm gì.",
      "Một khoảng lặng của cô ấy còn nói nhiều hơn cả trang thoại, nể thật sự.",
      "Cảnh tâm lý nặng mà xử lý nhẹ tênh, diễn tự nhiên tới mức nổi da gà.",
      "Vai nào cũng ra chất vai đó, không bị lặp không bị nhạt, biến hoá đỉnh cao.",
      "Diễn xuất chân thật tới mức quên mất đang xem phim, cứ ngỡ chuyện ngoài đời.",
      "Biểu cảm chuyển cực mượt, vui buồn đan xen trong một cảnh mà vẫn rõ từng lớp.",
      "Cảnh khóc không cần thuốc nhỏ mắt, cảm xúc thật một trăm phần trăm luôn.",
      "Đài từ tốt biểu cảm đỉnh hình thể chuẩn, đúng combo diễn viên thực lực.",
      "Diễn cảnh giằng xé nội tâm mà người xem nghẹn theo, cảm xúc thật từng giây.",
      "Hoá thân vào nhân vật khổ là khán giả thương lây, đó mới là diễn có hồn.",
      "Cười thì sáng cả màn hình, khóc thì kéo sập tâm trạng, làm chủ cảm xúc đỉnh.",
      "Ánh mắt thay được cả ngàn lời thoại, diễn bằng đôi mắt là điểm mạnh cực lớn.",
      "Cảnh nào cũng đầu tư cảm xúc thật, không có chuyện diễn cho qua bao giờ.",
      "Từ ánh nhìn tới cái run môi đều có tính toán, tinh tế tới từng chi tiết nhỏ.",
      "Vai phức tạp tới mấy cũng gỡ ra mượt mà, đúng kiểu nội lực diễn xuất thâm hậu.",
      "Diễn duyên dáng tự nhiên, mảng hài cũng hợp mà mảng bi cũng quá xuất sắc.",
      "Cảnh đối thoại căng thẳng mà tiết tấu cảm xúc giữ chắc, không hề bị đuối.",
      "Khán giả khóc cười theo từng phân đoạn, đó là minh chứng cho diễn xuất giỏi.",
      "Nhập tâm tới mức đóng máy rồi cảm xúc nhân vật vẫn còn vương, đáng nể ghê.",
      "Diễn cảnh điên loạn mà vẫn có lớp lang, không gào thét vô hồn, quá đẳng cấp.",
      "Mỗi lần lên hình là một lần làm người xem tin tuyệt đối vào nhân vật.",
      "Diễn xuất ngày càng chín, vai sau sâu hơn vai trước, tiến bộ thấy rõ luôn.",
      "Cảnh im lặng nhìn nhau thôi mà đủ làm tim người xem thắt lại, quá tinh tế.",
      "Bi kịch qua tay cô ấy không bị lê thê, mà đau một cách rất đẹp và rất thật.",
      "Làm chủ cả gương mặt lẫn cơ thể, từng cử chỉ nhỏ đều phục vụ cho nhân vật.",
      "Diễn vai mạnh mẽ thì ngầu, diễn vai yếu đuối thì thương, dạng nào cũng tới.",
      "Phản ứng trong cảnh quay rất thật, như thể đang sống chứ không phải đang diễn.",
      "Một ánh mắt rưng rưng đủ làm cả khung hình nặng trĩu, sức nặng cảm xúc đỉnh.",
      "Diễn xuất có chiều sâu, càng xem càng thấy nhiều lớp nghĩa ẩn trong từng cảnh.",
      "Hoá thân đa dạng, hôm nay tiểu thư mai lại giang hồ, vai nào cũng thuyết phục.",
      "Cảnh tình cảm diễn ngọt mà vẫn tinh tế, không hề lố, xem mà tan chảy luôn.",
      "Biểu cảm nhỏ xíu trên gương mặt cũng đủ kể hết nội tâm của nhân vật.",
      "Diễn bằng cả trái tim, nên cảm xúc truyền tới khán giả nguyên vẹn không hao.",
      "Cảnh cãi vã bùng nổ mà từng câu thoại đều có lực, nghe là nổi da gà.",
      "Nét diễn vừa bản năng vừa có kỹ thuật, đúng chuẩn tài năng được mài giũa kỹ.",
      "Vai diễn để đời là có thật, vì cô ấy bỏ vào đó cả tâm hồn lẫn nước mắt.",
      "Khả năng đẩy cảm xúc lên rồi kéo xuống cực mượt, dẫn dắt người xem tài tình.",
      "Diễn tới mức một cái nhếch môi cũng thành thoại, ngôn ngữ cơ thể quá đỉnh.",
      "Mỗi nhân vật đều có đời sống riêng dưới tay cô ấy, dấu ấn của diễn viên giỏi.",
    ],
  },
};

function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const PER_THEME = 125;
const out = [];

for (const key of Object.keys(themes)) {
  const t = themes[key];
  // build all combos, shuffle, then pick up to 3 per base until PER_THEME unique
  const combos = [];
  for (const base of t.bases)
    for (const op of t.openers)
      for (const em of t.emojis)
        combos.push({ base, op, em });
  shuffle(combos);

  const seen = new Set();
  const perBase = {};
  let collected = 0;
  for (const c of combos) {
    if (collected >= PER_THEME) break;
    if ((perBase[c.base] || 0) >= 3) continue;
    const body = c.op ? c.op + lowerFirst(c.base) : c.base;
    const caption = body + c.em;
    if (seen.has(caption)) continue;
    if (caption.length > 500) continue;
    seen.add(caption);
    perBase[c.base] = (perBase[c.base] || 0) + 1;
    collected++;
    out.push({
      messages: [
        { role: "user", content: RULES(pick(t.topics)) },
        { role: "assistant", content: caption },
      ],
    });
  }
  if (collected < PER_THEME)
    console.error(`WARN: ${key} only produced ${collected}`);
}

shuffle(out);
const lines = out.map((o) => JSON.stringify(o)).join("\n") + "\n";
fs.writeFileSync("captions_female_vn.jsonl", lines, { encoding: "utf8" });
console.log(`Wrote ${out.length} examples to captions_female_vn.jsonl`);
