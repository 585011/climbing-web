# Image Performance — Plan A: Backend (climbing-api)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Repository:** climbing-api (Kotlin + Spring Boot 3.5, JdbcTemplate, Java 21, Testcontainers). Local checkout: `/home/martin/Dokumenter/climbing-repo/climbing-api`. Branch off `main` (e.g. `feature/50-image-variants`).

**Goal:** Generate resized JPEG variants (thumbnail + optimized-full) for wall images on upload, keep the original, serve `thumbnailUrl`/optimized `imageUrl`, and backfill existing images via an admin endpoint.

**Architecture:** A new `ImageVariantService` (Thumbnailator) produces two JPEGs from the uploaded bytes. `WallService` uploads three objects (original, optimized, thumbnail) and stores three keys on the wall row. `WallMapper` presigns the optimized key for `imageUrl` and the thumbnail key for a new `thumbnailUrl`, each falling back to the original key. A protected `POST /api/walls/backfill-images` regenerates variants for walls that predate the pipeline.

**Tech Stack:** Kotlin, Spring Boot 3.5, Thumbnailator (`net.coobird:thumbnailator`), JdbcTemplate + Flyway (Postgres), JUnit 5 + Mockito + Testcontainers, AWS S3 SDK (R2).

## Global Constraints

- Reference spec: `climbing-web/docs/superpowers/specs/2026-07-06-image-performance-design.md`.
- Variant targets (named constants, single source of truth): thumbnail max width **400 px** quality **0.80**; optimized max width **1080 px** quality **0.82**. Never upscale (`targetWidth = min(maxWidth, sourceWidth)`).
- **Always keep the original.** `image_key` = original; add `optimized_key`, `thumbnail_key`.
- WebP input: ImageIO cannot decode it. On a null/failed decode with content type `image/webp`, fall back to using the original bytes for both variants; any other undecodable input throws `IllegalArgumentException` (→ 400).
- Add the two new `Wall` fields **last, with `= null` defaults**, so existing positional `Wall(...)` constructors keep compiling.
- Existing upload limits unchanged: allowed types `image/jpeg`, `image/png`, `image/webp`; max 20 MB.
- Backfill endpoint path must sit under `POST /api/walls/**` so the existing `SecurityConfig` `hasRole("admin")` matcher guards it — do not add new security config.
- Build/test: `./gradlew test` (from the api repo root). Commit messages end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: ImageVariantService + Thumbnailator dependency

**Files:**
- Modify: `build.gradle` (dependencies block)
- Create: `src/main/kotlin/com/example/climbingapi/service/ImageVariantService.kt`
- Test: `src/test/kotlin/com/example/climbingapi/ImageVariantServiceTest.kt`

**Interfaces:**
- Produces:
  - `data class ImageVariants(val optimized: ByteArray, val thumbnail: ByteArray, val contentType: String)`
  - `ImageVariantService.generate(bytes: ByteArray, contentType: String): ImageVariants`
  - constants `THUMBNAIL_MAX_WIDTH=400`, `OPTIMIZED_MAX_WIDTH=1080`, `THUMBNAIL_QUALITY=0.80`, `OPTIMIZED_QUALITY=0.82`

- [ ] **Step 1: Add the dependency**

In `build.gradle`, add to the `dependencies { ... }` block, next to the other `implementation` lines:

```groovy
    implementation 'net.coobird:thumbnailator:0.4.20'
```

- [ ] **Step 2: Write the failing test**

Create `src/test/kotlin/com/example/climbingapi/ImageVariantServiceTest.kt`:

```kotlin
package com.example.climbingapi

import com.example.climbingapi.service.ImageVariantService
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import javax.imageio.ImageIO

class ImageVariantServiceTest {

    private val service = ImageVariantService()

    // A 2000x1000 opaque PNG — larger than both variant width caps.
    private fun largePngBytes(): ByteArray {
        val img = BufferedImage(2000, 1000, BufferedImage.TYPE_INT_RGB)
        val g = img.createGraphics()
        g.color = java.awt.Color(120, 80, 60)
        g.fillRect(0, 0, 2000, 1000)
        g.dispose()
        val out = ByteArrayOutputStream()
        ImageIO.write(img, "png", out)
        return out.toByteArray()
    }

    private fun widthOf(bytes: ByteArray): Int =
        ImageIO.read(ByteArrayInputStream(bytes)).width

    @Test
    fun `generate downsizes to the variant width caps and outputs jpeg`() {
        val variants = service.generate(largePngBytes(), "image/png")

        assertEquals("image/jpeg", variants.contentType)
        assertEquals(ImageVariantService.THUMBNAIL_MAX_WIDTH, widthOf(variants.thumbnail))
        assertEquals(ImageVariantService.OPTIMIZED_MAX_WIDTH, widthOf(variants.optimized))
        // Both variants must be far smaller than the source bytes.
        assertTrue(variants.thumbnail.size < variants.optimized.size)
    }

    @Test
    fun `generate preserves aspect ratio`() {
        val variants = service.generate(largePngBytes(), "image/png")
        val thumb = ImageIO.read(ByteArrayInputStream(variants.thumbnail))
        // source is 2:1, so a 400px-wide thumbnail is 200px tall.
        assertEquals(200, thumb.height)
    }

    @Test
    fun `generate does not upscale a source smaller than the caps`() {
        val small = BufferedImage(150, 150, BufferedImage.TYPE_INT_RGB)
        val out = ByteArrayOutputStream()
        ImageIO.write(small, "png", out)

        val variants = service.generate(out.toByteArray(), "image/png")
        assertEquals(150, widthOf(variants.optimized))
        assertEquals(150, widthOf(variants.thumbnail))
    }

    @Test
    fun `generate falls back to original bytes for undecodable webp input`() {
        val webpBytes = byteArrayOf(1, 2, 3, 4) // not decodable by ImageIO
        val variants = service.generate(webpBytes, "image/webp")

        assertEquals("image/webp", variants.contentType)
        assertArrayEquals(webpBytes, variants.optimized)
        assertArrayEquals(webpBytes, variants.thumbnail)
    }

    @Test
    fun `generate throws on undecodable non-webp input`() {
        assertThrows(IllegalArgumentException::class.java) {
            service.generate(byteArrayOf(1, 2, 3, 4), "image/png")
        }
    }
}
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `./gradlew test --tests 'com.example.climbingapi.ImageVariantServiceTest'`
Expected: compilation failure / FAIL — `ImageVariantService` does not exist yet.

- [ ] **Step 4: Implement `ImageVariantService`**

Create `src/main/kotlin/com/example/climbingapi/service/ImageVariantService.kt`:

```kotlin
package com.example.climbingapi.service

import net.coobird.thumbnailator.Thumbnails
import org.springframework.stereotype.Service
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import javax.imageio.ImageIO

data class ImageVariants(
    val optimized: ByteArray,
    val thumbnail: ByteArray,
    val contentType: String
)

/**
 * Produces resized JPEG variants of an uploaded image: a small thumbnail for
 * list views and an optimized full-size for detail views. The caller keeps the
 * original separately.
 */
@Service
class ImageVariantService {

    fun generate(bytes: ByteArray, contentType: String): ImageVariants {
        val source = try {
            ImageIO.read(ByteArrayInputStream(bytes))
        } catch (_: Exception) {
            null
        }

        // ImageIO cannot decode WebP (and returns null for any unreadable input).
        // WebP uploads are already small, so fall back to the original bytes for
        // both variants rather than pulling in a native decoder.
        if (source == null) {
            if (contentType == "image/webp") {
                return ImageVariants(optimized = bytes, thumbnail = bytes, contentType = contentType)
            }
            throw IllegalArgumentException("Could not decode image for processing.")
        }

        return ImageVariants(
            optimized = resizeToJpeg(bytes, OPTIMIZED_MAX_WIDTH, OPTIMIZED_QUALITY, source.width),
            thumbnail = resizeToJpeg(bytes, THUMBNAIL_MAX_WIDTH, THUMBNAIL_QUALITY, source.width),
            contentType = "image/jpeg"
        )
    }

    private fun resizeToJpeg(bytes: ByteArray, maxWidth: Int, quality: Double, sourceWidth: Int): ByteArray {
        val targetWidth = minOf(maxWidth, sourceWidth) // never upscale
        val out = ByteArrayOutputStream()
        Thumbnails.of(ByteArrayInputStream(bytes))
            .width(targetWidth) // height is computed to preserve aspect ratio
            .outputFormat("jpg")
            .outputQuality(quality)
            .toOutputStream(out)
        return out.toByteArray()
    }

    companion object {
        const val THUMBNAIL_MAX_WIDTH = 400
        const val OPTIMIZED_MAX_WIDTH = 1080
        const val THUMBNAIL_QUALITY = 0.80
        const val OPTIMIZED_QUALITY = 0.82
    }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `./gradlew test --tests 'com.example.climbingapi.ImageVariantServiceTest'`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add build.gradle src/main/kotlin/com/example/climbingapi/service/ImageVariantService.kt src/test/kotlin/com/example/climbingapi/ImageVariantServiceTest.kt
git commit -m "feat: add ImageVariantService generating JPEG thumbnail + optimized variants

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Schema migration V6 + Wall model fields + StorageService.get

**Files:**
- Create: `src/main/resources/db/migration/V6__add_wall_image_variants.sql`
- Modify: `src/main/kotlin/com/example/climbingapi/model/Wall.kt`
- Modify: `src/main/kotlin/com/example/climbingapi/service/StorageService.kt`
- Modify: `src/main/kotlin/com/example/climbingapi/service/R2StorageService.kt`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces:
  - `Wall` gains `optimizedKey: String? = null`, `thumbnailKey: String? = null` (appended last).
  - `StorageService.get(key: String): ByteArray`.

- [ ] **Step 1: Write the migration**

Create `src/main/resources/db/migration/V6__add_wall_image_variants.sql`:

```sql
ALTER TABLE walls
    ADD COLUMN optimized_key varchar,
    ADD COLUMN thumbnail_key varchar;
```

- [ ] **Step 2: Add the model fields (appended last, defaulted)**

In `src/main/kotlin/com/example/climbingapi/model/Wall.kt`, append two fields after `createdAt`:

```kotlin
data class Wall(
    val id: Int?,
    val areaId: Int?,
    val name: String?,
    val description: String?,
    val latitude: BigDecimal?,
    val longitude: BigDecimal?,
    val approachInfo: String?,
    val imageKey: String?,
    val createdAt: OffsetDateTime?,
    val optimizedKey: String? = null,
    val thumbnailKey: String? = null
)
```

- [ ] **Step 3: Add `get` to the storage interface**

In `src/main/kotlin/com/example/climbingapi/service/StorageService.kt`, add to the interface:

```kotlin
    /** Downloads the raw bytes for an object key (used to regenerate variants). */
    fun get(key: String): ByteArray
```

- [ ] **Step 4: Implement `get` in R2StorageService**

In `src/main/kotlin/com/example/climbingapi/service/R2StorageService.kt`, add the import and method:

```kotlin
// add with the other s3.model imports:
import software.amazon.awssdk.core.ResponseBytes
import software.amazon.awssdk.services.s3.model.GetObjectResponse
```

```kotlin
    override fun get(key: String): ByteArray {
        val response: ResponseBytes<GetObjectResponse> = s3Client.getObjectAsBytes(
            GetObjectRequest.builder().bucket(props.bucket).key(key).build()
        )
        return response.asByteArray()
    }
```

- [ ] **Step 5: Verify it compiles**

Run: `./gradlew compileKotlin compileTestKotlin`
Expected: BUILD SUCCESSFUL (the new `Wall` fields default to null, so existing constructors still compile; `StorageService` has one implementation, now complete).

- [ ] **Step 6: Commit**

```bash
git add src/main/resources/db/migration/V6__add_wall_image_variants.sql src/main/kotlin/com/example/climbingapi/model/Wall.kt src/main/kotlin/com/example/climbingapi/service/StorageService.kt src/main/kotlin/com/example/climbingapi/service/R2StorageService.kt
git commit -m "feat: add wall image variant columns, Wall fields, StorageService.get

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: WallRepository — carry three keys + updateImageKeys + backfill query

**Files:**
- Modify: `src/main/kotlin/com/example/climbingapi/repository/WallRepository.kt`
- Modify: `src/test/kotlin/com/example/climbingapi/integration/WallControllerIT.kt` (complete the `StorageService` fake — see Step 0)
- Test: `src/test/kotlin/com/example/climbingapi/integration/WallRepositoryIT.kt` (create)

**Interfaces:**
- Consumes: `Wall.optimizedKey`, `Wall.thumbnailKey` (Task 2).
- Produces:
  - `WallRepository.updateImageKeys(id: Int, imageKey: String, optimizedKey: String, thumbnailKey: String): Wall?`
  - `WallRepository.findWallsNeedingBackfill(): List<Wall>`
  - the row mapper and every SELECT/INSERT now include `optimized_key`, `thumbnail_key`.
  - the existing single-arg `updateImageKey` is **kept** for now (WallService still calls it until Task 4). Do NOT remove it here: Gradle compiles main sources before test sources, so removing it breaks WallService and prevents `WallRepositoryIT` from running. Task 4 switches WallService to `updateImageKeys` and removes `updateImageKey` then.

**Cross-task correction (read first):** Task 2 added `fun get(key: String): ByteArray` to the `StorageService` interface but did **not** update the existing in-memory fake in `WallControllerIT.FakeStorageConfig`, which implements `StorageService` as an anonymous object. As a result the test source tree does **not** compile on a clean build (a stale Gradle `UP-TO-DATE` masked this in Task 2). Step 0 fixes it. Also: verify by **running the test** (which forces a real test compile), not by `compileTestKotlin` alone — that task can report a stale `UP-TO-DATE`.

- [ ] **Step 0: Complete the StorageService fake so the test tree compiles**

In `src/test/kotlin/com/example/climbingapi/integration/WallControllerIT.kt`, inside the anonymous `object : StorageService` in `FakeStorageConfig`, add the missing override (it is never called by `WallControllerIT`, so an empty array is fine):

```kotlin
            override fun get(key: String): ByteArray = ByteArray(0)
```

- [ ] **Step 1: Write the failing integration test**

`IntegrationTestBase` (which `WallControllerIT` extends) provides the Testcontainers Postgres bootstrap, `mockMvc`, `jdbcTemplate`, `objectMapper`, admin-JWT helpers, `postJson`, `extractId`, and a `@BeforeEach` that TRUNCATEs all tables (`RESTART IDENTITY`). So **there is no seeded area** — the test must create one (walls have a NOT-NULL-ish `area_id` FK). Booting the full context also needs a `StorageService` bean, so import the same fake `WallControllerIT` uses.

Create `src/test/kotlin/com/example/climbingapi/integration/WallRepositoryIT.kt`:

```kotlin
package com.example.climbingapi.integration

import com.example.climbingapi.model.Wall
import com.example.climbingapi.repository.WallRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import

@Import(WallControllerIT.FakeStorageConfig::class)
class WallRepositoryIT : IntegrationTestBase() {

    @Autowired lateinit var wallRepository: WallRepository

    private var areaId = 0

    @BeforeEach
    fun createArea() {
        // resetDatabase() in IntegrationTestBase truncates everything first (runs before this).
        areaId = extractId(postJson("/api/climbing-areas", """{"name":"Test Area"}"""))
    }

    @Test
    fun `create and read round-trips all three image keys`() {
        val created = wallRepository.create(
            Wall(
                id = null, areaId = areaId, name = "Variant Wall", description = null,
                latitude = null, longitude = null, approachInfo = null,
                imageKey = "walls/orig.png", createdAt = null,
                optimizedKey = "walls/opt.jpg", thumbnailKey = "walls/thumb.jpg"
            )
        )
        val fetched = wallRepository.getById(created.id!!)
        assertNotNull(fetched)
        assertEquals("walls/orig.png", fetched!!.imageKey)
        assertEquals("walls/opt.jpg", fetched.optimizedKey)
        assertEquals("walls/thumb.jpg", fetched.thumbnailKey)
    }

    @Test
    fun `updateImageKeys replaces all three keys`() {
        val created = wallRepository.create(
            Wall(
                id = null, areaId = areaId, name = "Update Wall", description = null,
                latitude = null, longitude = null, approachInfo = null,
                imageKey = "walls/old.png", createdAt = null
            )
        )
        val updated = wallRepository.updateImageKeys(created.id!!, "walls/o2.png", "walls/opt2.jpg", "walls/th2.jpg")
        assertNotNull(updated)
        assertEquals("walls/o2.png", updated!!.imageKey)
        assertEquals("walls/opt2.jpg", updated.optimizedKey)
        assertEquals("walls/th2.jpg", updated.thumbnailKey)
    }

    @Test
    fun `findWallsNeedingBackfill returns walls with an original but missing variants`() {
        val needs = wallRepository.create(
            Wall(
                id = null, areaId = areaId, name = "Needs Backfill", description = null,
                latitude = null, longitude = null, approachInfo = null,
                imageKey = "walls/needs.png", createdAt = null
            )
        )
        val done = wallRepository.create(
            Wall(
                id = null, areaId = areaId, name = "Already Done", description = null,
                latitude = null, longitude = null, approachInfo = null,
                imageKey = "walls/done.png", createdAt = null,
                optimizedKey = "walls/done-opt.jpg", thumbnailKey = "walls/done-th.jpg"
            )
        )
        val result = wallRepository.findWallsNeedingBackfill()
        assertTrue(result.any { it.id == needs.id })
        assertTrue(result.none { it.id == done.id })
    }
}
```

Note: `FakeStorageConfig` is a nested class of `WallControllerIT`; referencing it as `WallControllerIT.FakeStorageConfig::class` reuses the same fake (now with the Step 0 `get()` override) without duplicating it.

- [ ] **Step 2: Run the test to verify it fails**

Run: `./gradlew test --tests 'com.example.climbingapi.integration.WallRepositoryIT'`
Expected: FAIL — `updateImageKeys` / `findWallsNeedingBackfill` don't exist, and the row mapper doesn't read the new columns. (This run also forces a real test compile, confirming the Step 0 fake fix.)

- [ ] **Step 3: Update the repository**

In `src/main/kotlin/com/example/climbingapi/repository/WallRepository.kt`:

(a) Extend the row mapper to read the two new columns:

```kotlin
    private val wallRowMapper = RowMapper { rs, _ ->
        val createdTime = rs.getObject("created_at", OffsetDateTime::class.java)

        Wall(
            id = rs.getInt("id"),
            areaId = rs.getInt("area_id"),
            name = rs.getString("name"),
            description = rs.getString("description"),
            latitude = rs.getBigDecimal("latitude"),
            longitude = rs.getBigDecimal("longitude"),
            approachInfo = rs.getString("approach_info"),
            imageKey = rs.getString("image_key"),
            createdAt = createdTime,
            optimizedKey = rs.getString("optimized_key"),
            thumbnailKey = rs.getString("thumbnail_key")
        )
    }
```

(b) Add `optimized_key, thumbnail_key` to the column list of **every** SELECT and to all `RETURNING` clauses — in `getAll`, `getById`, `findByAreaId`, `update`, `create` (and the new methods below). For example `getById` becomes:

```kotlin
    fun getById(id: Int): Wall? {
        val sql = """
            SELECT
                id, area_id, name, description, latitude, longitude,
                approach_info, image_key, created_at, optimized_key, thumbnail_key
            FROM walls
            WHERE id = ?
        """.trimIndent()
        return jdbcTemplate.query(sql, wallRowMapper, id).firstOrNull()
    }
```

Apply the same column additions to `getAll`, `findByAreaId`, and to both the SELECT-less `create`/`update` `RETURNING` lists. (The `create` INSERT column list and `update` SET list are unchanged — only their `RETURNING` clauses gain the two columns.) Leave `create` inserting only `image_key` (new rows set variants via `updateImageKeys` or the create path passing them — see note). **However**, `create` must persist the variant keys too, so change its INSERT:

```kotlin
    fun create(wall: Wall): Wall {
        val sql = """
            INSERT INTO walls (
                area_id, name, description, latitude, longitude,
                approach_info, image_key, optimized_key, thumbnail_key
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id, area_id, name, description, latitude, longitude,
                      approach_info, image_key, created_at, optimized_key, thumbnail_key
        """.trimIndent()

        return jdbcTemplate.query(
            sql, wallRowMapper,
            wall.areaId, wall.name, wall.description, wall.latitude, wall.longitude,
            wall.approachInfo, wall.imageKey, wall.optimizedKey, wall.thumbnailKey
        ).firstOrNull() ?: error("INSERT RETURNING returned no row")
    }
```

(c) Replace `updateImageKey` with `updateImageKeys`:

```kotlin
    fun updateImageKeys(id: Int, imageKey: String, optimizedKey: String, thumbnailKey: String): Wall? {
        val sql = """
            UPDATE walls
            SET image_key = ?, optimized_key = ?, thumbnail_key = ?
            WHERE id = ?
            RETURNING id, area_id, name, description, latitude, longitude,
                      approach_info, image_key, created_at, optimized_key, thumbnail_key
        """.trimIndent()
        return jdbcTemplate.query(sql, wallRowMapper, imageKey, optimizedKey, thumbnailKey, id).firstOrNull()
    }
```

(d) Add the backfill query:

```kotlin
    fun findWallsNeedingBackfill(): List<Wall> {
        val sql = """
            SELECT
                id, area_id, name, description, latitude, longitude,
                approach_info, image_key, created_at, optimized_key, thumbnail_key
            FROM walls
            WHERE image_key IS NOT NULL
              AND (optimized_key IS NULL OR thumbnail_key IS NULL)
            ORDER BY id
        """.trimIndent()
        return jdbcTemplate.query(sql, wallRowMapper)
    }
```

Note: `update` (the non-image update) must keep NOT touching image columns; just add `optimized_key, thumbnail_key` to its `RETURNING` list so the returned `Wall` is complete.

- [ ] **Step 4: Run the test to verify it passes**

Run: `./gradlew test --tests 'com.example.climbingapi.integration.WallRepositoryIT'`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/main/kotlin/com/example/climbingapi/repository/WallRepository.kt src/test/kotlin/com/example/climbingapi/integration/WallRepositoryIT.kt src/test/kotlin/com/example/climbingapi/integration/WallControllerIT.kt
git commit -m "feat: persist and query wall image variant keys in the repository

Also completes the WallControllerIT StorageService fake with the get()
override added to the interface in the previous task.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: WallService — generate + store three objects, compensation, backfill

**Files:**
- Modify: `src/main/kotlin/com/example/climbingapi/service/WallService.kt`
- Modify: `src/main/kotlin/com/example/climbingapi/repository/WallRepository.kt` (remove the now-unused single-arg `updateImageKey` — see Step 4)
- Test: `src/test/kotlin/com/example/climbingapi/WallServiceTest.kt`

**Interfaces:**
- Consumes: `ImageVariantService.generate` (Task 1), `StorageService.get` (Task 2), `WallRepository.updateImageKeys` + `findWallsNeedingBackfill` (Task 3).
- Produces:
  - `WallService.backfillImages(): BackfillResult`
  - `data class BackfillResult(val processed: Int, val failed: Int)`
  - `WallService` constructor gains an `imageVariantService: ImageVariantService` parameter.
  - `WallRepository.updateImageKey` (single-arg) is removed once `WallService` no longer calls it.

- [ ] **Step 1: Update the existing test fixture + add new tests**

In `src/test/kotlin/com/example/climbingapi/WallServiceTest.kt`:

(a) Add a mock for the new collaborator and pass it via `@InjectMocks` (already used). Add:

```kotlin
import com.example.climbingapi.service.ImageVariantService
import com.example.climbingapi.service.ImageVariants
import com.example.climbingapi.service.WallService.BackfillResult
```

```kotlin
    @Mock lateinit var imageVariantService: ImageVariantService
```

(b) Any existing test that calls `wallService.create(request, jpeg)` or `replaceImage` now routes through `imageVariantService.generate` and three `storageService.upload` calls. Stub them in those tests:

```kotlin
    private val variants = ImageVariants(byteArrayOf(9), byteArrayOf(8), "image/jpeg")
    // in tests that upload an image:
    `when`(imageVariantService.generate(any(), any())).thenReturn(variants)
    `when`(storageService.upload(any(), any())).thenReturn("walls/orig", "walls/opt", "walls/thumb")
```

(Use `org.mockito.Mockito.any` / `org.mockito.ArgumentMatchers.any`. Consecutive `thenReturn` values map to the three upload calls in order.)

(c) Add new tests:

```kotlin
    @Test
    fun `create stores original, optimized, and thumbnail keys`() {
        val request = CreateWallRequest(areaId = 1, name = "W", description = null,
            latitude = null, longitude = null, approachInfo = null)
        `when`(imageVariantService.generate(any(), any())).thenReturn(variants)
        `when`(storageService.upload(any(), any())).thenReturn("walls/orig", "walls/opt", "walls/thumb")
        `when`(wallRepository.create(any())).thenAnswer { it.getArgument(0) }

        wallService.create(request, jpeg)

        val captor = org.mockito.ArgumentCaptor.forClass(Wall::class.java)
        verify(wallRepository).create(captor.capture())
        assertEquals("walls/orig", captor.value.imageKey)
        assertEquals("walls/opt", captor.value.optimizedKey)
        assertEquals("walls/thumb", captor.value.thumbnailKey)
    }

    @Test
    fun `replaceImage deletes the three old keys after a successful swap`() {
        val old = Wall(1, 1, "W", null, null, null, null, "walls/oldO", OffsetDateTime.now(),
            "walls/oldOpt", "walls/oldThumb")
        `when`(wallRepository.getById(1)).thenReturn(old)
        `when`(imageVariantService.generate(any(), any())).thenReturn(variants)
        `when`(storageService.upload(any(), any())).thenReturn("walls/newO", "walls/newOpt", "walls/newThumb")
        `when`(wallRepository.updateImageKeys(1, "walls/newO", "walls/newOpt", "walls/newThumb"))
            .thenReturn(old.copy(imageKey = "walls/newO"))

        wallService.replaceImage(1, jpeg)

        verify(storageService).delete("walls/oldO")
        verify(storageService).delete("walls/oldOpt")
        verify(storageService).delete("walls/oldThumb")
    }

    @Test
    fun `backfillImages processes only walls missing variants and is idempotent on a second run`() {
        val needs = Wall(5, 1, "W", null, null, null, null, "walls/orig.png", OffsetDateTime.now())
        `when`(wallRepository.findWallsNeedingBackfill()).thenReturn(listOf(needs), emptyList())
        `when`(storageService.get("walls/orig.png")).thenReturn(byteArrayOf(1))
        `when`(imageVariantService.generate(any(), any())).thenReturn(variants)
        `when`(storageService.upload(any(), any())).thenReturn("walls/opt", "walls/thumb")
        `when`(wallRepository.updateImageKeys(5, "walls/orig.png", "walls/opt", "walls/thumb"))
            .thenReturn(needs)

        val first = wallService.backfillImages()
        val second = wallService.backfillImages()

        assertEquals(1, first.processed)
        assertEquals(0, first.failed)
        assertEquals(0, second.processed)
    }

    @Test
    fun `backfillImages counts a per-wall failure without aborting`() {
        val a = Wall(6, 1, "A", null, null, null, null, "walls/a.png", OffsetDateTime.now())
        val b = Wall(7, 1, "B", null, null, null, null, "walls/b.png", OffsetDateTime.now())
        `when`(wallRepository.findWallsNeedingBackfill()).thenReturn(listOf(a, b))
        `when`(storageService.get("walls/a.png")).thenThrow(RuntimeException("boom"))
        `when`(storageService.get("walls/b.png")).thenReturn(byteArrayOf(1))
        `when`(imageVariantService.generate(any(), any())).thenReturn(variants)
        `when`(storageService.upload(any(), any())).thenReturn("walls/opt", "walls/thumb")
        `when`(wallRepository.updateImageKeys(eq(7), any(), any(), any())).thenReturn(b)

        val result = wallService.backfillImages()

        assertEquals(1, result.processed)
        assertEquals(1, result.failed)
    }
```

Add imports as needed: `org.mockito.ArgumentMatchers.any`, `org.mockito.ArgumentMatchers.eq`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `./gradlew test --tests 'com.example.climbingapi.WallServiceTest'`
Expected: FAIL — `imageVariantService` field / `backfillImages` / new store behavior don't exist.

- [ ] **Step 3: Implement the WallService changes**

In `src/main/kotlin/com/example/climbingapi/service/WallService.kt`:

(a) Add the collaborator to the constructor:

```kotlin
class WallService(
    private val wallRepository: WallRepository,
    private val routeService: RouteService,
    private val storageService: StorageService,
    private val imageVariantService: ImageVariantService
) {
```

(b) Add a logger and helpers, and replace `uploadImage`:

```kotlin
    private data class StoredImage(val originalKey: String, val optimizedKey: String, val thumbnailKey: String)

    private fun uploadImage(image: MultipartFile): StoredImage {
        if (image.isEmpty) throw IllegalArgumentException("Image file is empty.")
        val contentType = image.contentType
        if (contentType == null || contentType !in ALLOWED_IMAGE_TYPES) {
            throw IllegalArgumentException("Unsupported image type. Allowed: image/jpeg, image/png, image/webp.")
        }
        if (image.size > MAX_IMAGE_BYTES) {
            throw PayloadTooLargeException("Image exceeds the maximum size of 20 MB.")
        }
        val variants = imageVariantService.generate(image.bytes, contentType)
        val originalKey = storageService.upload(image.bytes, contentType)
        val optimizedKey = storageService.upload(variants.optimized, variants.contentType)
        val thumbnailKey = storageService.upload(variants.thumbnail, variants.contentType)
        return StoredImage(originalKey, optimizedKey, thumbnailKey)
    }

    private fun deleteAll(s: StoredImage) {
        storageService.delete(s.originalKey)
        storageService.delete(s.optimizedKey)
        storageService.delete(s.thumbnailKey)
    }
```

(c) Update `create`:

```kotlin
    fun create(request: CreateWallRequest, image: MultipartFile? = null): Wall {
        val stored = image?.let { uploadImage(it) }
        val wall = Wall(
            id = null,
            areaId = request.areaId,
            name = request.name?.trim(),
            description = request.description,
            latitude = request.latitude,
            longitude = request.longitude,
            approachInfo = request.approachInfo,
            imageKey = stored?.originalKey,
            createdAt = null,
            optimizedKey = stored?.optimizedKey,
            thumbnailKey = stored?.thumbnailKey
        )
        return try {
            wallRepository.create(wall)
        } catch (e: Exception) {
            stored?.let { deleteAll(it) }
            throw e
        }
    }
```

(d) Update `replaceImage`:

```kotlin
    @Transactional
    fun replaceImage(id: Int, image: MultipartFile): Wall {
        val existing = getById(id)
        val stored = uploadImage(image)
        val updated = try {
            wallRepository.updateImageKeys(id, stored.originalKey, stored.optimizedKey, stored.thumbnailKey)
                ?: throw NotFoundException("Wall not found: $id")
        } catch (e: Exception) {
            deleteAll(stored)
            throw e
        }
        listOfNotNull(existing.imageKey, existing.optimizedKey, existing.thumbnailKey)
            .forEach { storageService.delete(it) }
        return updated
    }
```

(e) Add `backfillImages` and `BackfillResult`:

```kotlin
    fun backfillImages(): BackfillResult {
        var processed = 0
        var failed = 0
        for (wall in wallRepository.findWallsNeedingBackfill()) {
            val originalKey = wall.imageKey ?: continue
            try {
                val bytes = storageService.get(originalKey)
                val variants = imageVariantService.generate(bytes, contentTypeForKey(originalKey))
                val optimizedKey = storageService.upload(variants.optimized, variants.contentType)
                val thumbnailKey = storageService.upload(variants.thumbnail, variants.contentType)
                wallRepository.updateImageKeys(wall.id!!, originalKey, optimizedKey, thumbnailKey)
                processed++
            } catch (e: Exception) {
                logger.warn("Backfill failed for wall {}: {}", wall.id, e.message)
                failed++
            }
        }
        return BackfillResult(processed, failed)
    }

    private fun contentTypeForKey(key: String): String = when {
        key.endsWith(".png") -> "image/png"
        key.endsWith(".webp") -> "image/webp"
        else -> "image/jpeg"
    }

    data class BackfillResult(val processed: Int, val failed: Int)
```

(f) Add the logger + import to the companion/imports:

```kotlin
import org.slf4j.LoggerFactory
```

```kotlin
    companion object {
        private val ALLOWED_IMAGE_TYPES = setOf("image/jpeg", "image/png", "image/webp")
        private const val MAX_IMAGE_BYTES = 20L * 1024 * 1024
        private val logger = LoggerFactory.getLogger(WallService::class.java)
    }
```

- [ ] **Step 4: Remove the now-unused single-arg `updateImageKey`**

`WallService` no longer calls `WallRepository.updateImageKey` (both `replaceImage` and `backfillImages` use `updateImageKeys`). Delete the entire `updateImageKey(id: Int, imageKey: String): Wall?` function from `src/main/kotlin/com/example/climbingapi/repository/WallRepository.kt` (Task 3 deliberately kept it so main compiled; it is dead now). Leave `updateImageKeys` and everything else intact.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `./gradlew test --tests 'com.example.climbingapi.WallServiceTest'`
Expected: PASS (existing tests + 4 new). This forces a real main+test compile, confirming the `updateImageKey` removal left no dangling references.

- [ ] **Step 6: Commit**

```bash
git add src/main/kotlin/com/example/climbingapi/service/WallService.kt src/main/kotlin/com/example/climbingapi/repository/WallRepository.kt src/test/kotlin/com/example/climbingapi/WallServiceTest.kt
git commit -m "feat: generate and store image variants on upload; add backfill

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: WallResponse + WallMapper — thumbnailUrl and optimized imageUrl

**Files:**
- Modify: `src/main/kotlin/com/example/climbingapi/dto/WallResponse.kt`
- Modify: `src/main/kotlin/com/example/climbingapi/mapper/WallMapper.kt`
- Test: `src/test/kotlin/com/example/climbingapi/WallMapperTest.kt` (create)

**Interfaces:**
- Consumes: `Wall.optimizedKey`, `Wall.thumbnailKey` (Task 2).
- Produces: `WallResponse.thumbnailUrl: String?`; `imageUrl` now presigns `optimizedKey ?: imageKey`.

- [ ] **Step 1: Write the failing test**

Create `src/test/kotlin/com/example/climbingapi/WallMapperTest.kt`:

```kotlin
package com.example.climbingapi

import com.example.climbingapi.mapper.WallMapper
import com.example.climbingapi.model.Wall
import com.example.climbingapi.service.StorageService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.Mock
import org.mockito.Mockito.lenient
import org.mockito.junit.jupiter.MockitoExtension
import java.time.OffsetDateTime

@ExtendWith(MockitoExtension::class)
class WallMapperTest {

    @Mock lateinit var storageService: StorageService

    private fun mapper() = WallMapper(storageService)

    @Test
    fun `imageUrl prefers optimized key, thumbnailUrl prefers thumbnail key`() {
        lenient().`when`(storageService.presignGet("opt")).thenReturn("http://opt")
        lenient().`when`(storageService.presignGet("thumb")).thenReturn("http://thumb")
        val wall = Wall(1, 1, "W", null, null, null, null, "orig", OffsetDateTime.now(), "opt", "thumb")

        val res = mapper().toResponse(wall)

        assertEquals("http://opt", res.imageUrl)
        assertEquals("http://thumb", res.thumbnailUrl)
    }

    @Test
    fun `falls back to the original key when variants are missing`() {
        lenient().`when`(storageService.presignGet("orig")).thenReturn("http://orig")
        val wall = Wall(1, 1, "W", null, null, null, null, "orig", OffsetDateTime.now())

        val res = mapper().toResponse(wall)

        assertEquals("http://orig", res.imageUrl)
        assertEquals("http://orig", res.thumbnailUrl)
    }

    @Test
    fun `null image produces null urls`() {
        val wall = Wall(1, 1, "W", null, null, null, null, null, OffsetDateTime.now())
        val res = mapper().toResponse(wall)
        assertNull(res.imageUrl)
        assertNull(res.thumbnailUrl)
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `./gradlew test --tests 'com.example.climbingapi.WallMapperTest'`
Expected: FAIL — `WallResponse` has no `thumbnailUrl`; mapper doesn't set it.

- [ ] **Step 3: Add the DTO field**

In `src/main/kotlin/com/example/climbingapi/dto/WallResponse.kt`, add `thumbnailUrl` after `imageUrl`:

```kotlin
    val imageUrl: String?,
    val thumbnailUrl: String?,
    val createdAt: OffsetDateTime
```

- [ ] **Step 4: Update the mapper**

In `src/main/kotlin/com/example/climbingapi/mapper/WallMapper.kt`, set both URLs with the fallback:

```kotlin
    fun toResponse(wall: Wall): WallResponse {
        return WallResponse(
            id = wall.id!!,
            areaId = wall.areaId!!,
            name = wall.name!!,
            description = wall.description,
            latitude = wall.latitude,
            longitude = wall.longitude,
            approachInfo = wall.approachInfo,
            imageUrl = (wall.optimizedKey ?: wall.imageKey)?.let { storageService.presignGet(it) },
            thumbnailUrl = (wall.thumbnailKey ?: wall.imageKey)?.let { storageService.presignGet(it) },
            createdAt = wall.createdAt!!
        )
    }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `./gradlew test --tests 'com.example.climbingapi.WallMapperTest'`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/main/kotlin/com/example/climbingapi/dto/WallResponse.kt src/main/kotlin/com/example/climbingapi/mapper/WallMapper.kt src/test/kotlin/com/example/climbingapi/WallMapperTest.kt
git commit -m "feat: expose thumbnailUrl and serve optimized image variant

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Backfill controller endpoint

**Files:**
- Modify: `src/main/kotlin/com/example/climbingapi/controller/WallController.kt`
- Test: `src/test/kotlin/com/example/climbingapi/integration/WallControllerIT.kt`

**Interfaces:**
- Consumes: `WallService.backfillImages(): BackfillResult` (Task 4).
- Produces: `POST /api/walls/backfill-images` → `200 { "processed": N, "failed": M }`.

- [ ] **Step 1: Write the failing test**

In `src/test/kotlin/com/example/climbingapi/integration/WallControllerIT.kt`, add tests that mirror the file's existing MockMvc + JWT auth helpers (copy how other admin POSTs authenticate an admin JWT and how anonymous/non-admin requests are built in that file):

```kotlin
    @Test
    fun `backfill requires admin`() {
        // anonymous or non-admin POST — use the SAME unauthenticated request style
        // other tests in this file use for asserting 401/403 on admin routes.
        mockMvc.perform(post("/api/walls/backfill-images"))
            .andExpect(status().isUnauthorized) // or isForbidden, matching this file's convention
    }

    @Test
    fun `backfill as admin returns processed and failed counts`() {
        mockMvc.perform(
            post("/api/walls/backfill-images").with(adminJwt()) // reuse this file's admin-JWT helper
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.processed").exists())
            .andExpect(jsonPath("$.failed").exists())
    }
```

If `WallControllerIT` names its admin-JWT helper differently, use that exact helper. Match the existing `import static` / MockMvc request-builder style already in the file.

- [ ] **Step 2: Run the test to verify it fails**

Run: `./gradlew test --tests 'com.example.climbingapi.integration.WallControllerIT'`
Expected: FAIL — the endpoint doesn't exist (404).

- [ ] **Step 3: Add the endpoint**

In `src/main/kotlin/com/example/climbingapi/controller/WallController.kt`, add a handler. It sits under `/api/walls` (the controller's base mapping) so the path is `/api/walls/backfill-images`, matched by the existing `POST /api/walls/**` admin rule:

```kotlin
    @Operation(summary = "Regenerate image variants for walls missing them (admin only)")
    @PostMapping("/backfill-images")
    fun backfillImages(): WallService.BackfillResult = wallService.backfillImages()
```

Ensure `wallService` is already injected in the controller (it is — used by the other handlers). Add the `@PostMapping` import if not present (it is).

- [ ] **Step 4: Run the test to verify it passes**

Run: `./gradlew test --tests 'com.example.climbingapi.integration.WallControllerIT'`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `./gradlew test`
Expected: BUILD SUCCESSFUL — all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/main/kotlin/com/example/climbingapi/controller/WallController.kt src/test/kotlin/com/example/climbingapi/integration/WallControllerIT.kt
git commit -m "feat: add admin backfill-images endpoint

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Harden ImageVariantService against decompression bombs

**Files:**
- Modify: `src/main/kotlin/com/example/climbingapi/service/ImageVariantService.kt`
- Test: `src/test/kotlin/com/example/climbingapi/ImageVariantServiceTest.kt`

**Interfaces:**
- Consumes: nothing new.
- Produces: `ImageVariantService.exceedsPixelLimit(width: Int, height: Int): Boolean` (used internally + directly testable); `generate` now rejects oversized images and decodes the source only once.

**Why:** `generate` currently decodes the full image to a raster (`width × height × 4` bytes) with no dimension cap — a 20 MB compressed PNG can decode to hundreds of MB — and `resizeToJpeg` re-decodes the bytes once per variant (three decodes total). `backfillImages` runs this inline over many originals. This task caps source pixels and decodes once, reusing the `BufferedImage`.

- [ ] **Step 1: Add the failing tests**

Append to `src/test/kotlin/com/example/climbingapi/ImageVariantServiceTest.kt`:

```kotlin
    @Test
    fun `exceedsPixelLimit flags images over the cap and passes normal ones`() {
        // Uses plain ints — does NOT allocate a giant image.
        org.junit.jupiter.api.Assertions.assertTrue(service.exceedsPixelLimit(10_000, 6_000))   // 60 MP > cap
        org.junit.jupiter.api.Assertions.assertFalse(service.exceedsPixelLimit(4_000, 3_000))   // 12 MP < cap
    }
```

(The existing `largePngBytes` tests — 2000×1000 = 2 MP — already prove a normal image still produces variants, so no change there.)

- [ ] **Step 2: Run to verify it fails**

Run: `./gradlew test --tests 'com.example.climbingapi.ImageVariantServiceTest'`
Expected: FAIL — `exceedsPixelLimit` does not exist.

- [ ] **Step 3: Implement the guard + decode-once**

In `src/main/kotlin/com/example/climbingapi/service/ImageVariantService.kt`:

(a) Add the import:

```kotlin
import java.awt.image.BufferedImage
```

(b) Replace `generate` so it checks the pixel cap and passes the decoded `source` to `resizeToJpeg`:

```kotlin
    fun generate(bytes: ByteArray, contentType: String): ImageVariants {
        val source = try {
            ImageIO.read(ByteArrayInputStream(bytes))
        } catch (_: Exception) {
            null
        }

        // ImageIO cannot decode WebP (and returns null for any unreadable input).
        // WebP uploads are already small, so fall back to the original bytes for
        // both variants rather than pulling in a native decoder.
        if (source == null) {
            if (contentType == "image/webp") {
                return ImageVariants(optimized = bytes, thumbnail = bytes, contentType = contentType)
            }
            throw IllegalArgumentException("Could not decode image for processing.")
        }

        if (exceedsPixelLimit(source.width, source.height)) {
            throw IllegalArgumentException("Image dimensions too large to process.")
        }

        return ImageVariants(
            optimized = resizeToJpeg(source, OPTIMIZED_MAX_WIDTH, OPTIMIZED_QUALITY),
            thumbnail = resizeToJpeg(source, THUMBNAIL_MAX_WIDTH, THUMBNAIL_QUALITY),
            contentType = "image/jpeg"
        )
    }

    /** True when width × height exceeds the safe decode limit (guards against decompression bombs). */
    fun exceedsPixelLimit(width: Int, height: Int): Boolean =
        width.toLong() * height.toLong() > MAX_SOURCE_PIXELS
```

(c) Replace `resizeToJpeg` to take the already-decoded image (decode once, reuse):

```kotlin
    private fun resizeToJpeg(source: BufferedImage, maxWidth: Int, quality: Double): ByteArray {
        val targetWidth = minOf(maxWidth, source.width) // never upscale
        val out = ByteArrayOutputStream()
        Thumbnails.of(source)
            .width(targetWidth) // height is computed to preserve aspect ratio
            .outputFormat("jpg")
            .outputQuality(quality)
            .toOutputStream(out)
        return out.toByteArray()
    }
```

(d) Add the constant to the companion object:

```kotlin
        const val MAX_SOURCE_PIXELS = 50_000_000L // ~50 MP: generous for phone photos, blocks decode bombs
```

- [ ] **Step 4: Run to verify it passes**

Run: `./gradlew test --tests 'com.example.climbingapi.ImageVariantServiceTest'`
Expected: PASS — the new test plus all existing ImageVariantService tests (the decode-once refactor produces identical output, so the width/aspect/no-upscale/webp/throw tests stay green).

- [ ] **Step 5: Commit**

```bash
git add src/main/kotlin/com/example/climbingapi/service/ImageVariantService.kt src/test/kotlin/com/example/climbingapi/ImageVariantServiceTest.kt
git commit -m "fix: cap image pixel dimensions and decode once (decompression-bomb guard)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Post-implementation (manual, at deploy)

After merge + deploy, run once with an admin token:

```bash
curl -X POST https://<api-host>/api/walls/backfill-images -H "Authorization: Bearer <admin-jwt>"
# → {"processed":N,"failed":0}
```

## Self-Review

**Spec coverage:** ImageVariantService (Task 1) ✅; schema + model + StorageService.get (Task 2) ✅; repository three-key persistence + backfill query (Task 3) ✅; WallService variant upload + compensation + backfill (Task 4) ✅; WallResponse/WallMapper thumbnailUrl + optimized preference (Task 5) ✅; admin backfill endpoint (Task 6) ✅; decompression-bomb guard + decode-once (Task 7) ✅. Variant dims/quality constants centralized in Task 1 ✅. Keep-original honored (original uploaded + kept; imageKey never overwritten by a variant) ✅.

**Placeholder scan:** No TBD/TODO. Test setup that must match existing files (Testcontainers bootstrap in Task 3, admin-JWT helper + 401/403 convention in Task 6) is called out explicitly with the instruction to copy the exact existing pattern rather than invented code — this is deliberate (those helpers live in files the implementer will open), not a placeholder for logic.

**Type consistency:** `updateImageKeys(id, imageKey, optimizedKey, thumbnailKey)` signature identical in Task 3 (def), Task 4 (calls). `BackfillResult(processed, failed)` identical in Task 4 (def) and Task 6 (JSON assertions). `ImageVariants(optimized, thumbnail, contentType)` identical Task 1 (def) / Task 4 (stub). `Wall` positional order — new fields appended last with defaults, matching every `Wall(...)` used in tests. `WallService` constructor gains `imageVariantService` (Task 4) — Spring autowires it; no other call site constructs `WallService` except tests via `@InjectMocks`.
